import { Controller, Get, Post, Param, Body, UseGuards, Request } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

class SendMessageDto {
    @IsString() @MinLength(1) @MaxLength(2000) content: string;
}

@ApiTags('chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
    constructor(private prisma: PrismaService) { }

    /** List all other users to chat with, with last message and unread count */
    @Get('contacts')
    async getContacts(@Request() req: any) {
        const me = req.user.id;
        const users = await this.prisma.user.findMany({
            where: { id: { not: me } },
            select: { id: true, name: true, role: true },
            orderBy: { name: 'asc' },
        });

        // For each user get last message + unread count
        const contacts = await Promise.all(users.map(async u => {
            const last = await this.prisma.chatMessage.findFirst({
                where: {
                    OR: [
                        { senderId: me, receiverId: u.id },
                        { senderId: u.id, receiverId: me },
                    ],
                },
                orderBy: { createdAt: 'desc' },
            });
            const unread = await this.prisma.chatMessage.count({
                where: { senderId: u.id, receiverId: me, isRead: false },
            });
            return { ...u, lastMessage: last, unreadCount: unread };
        }));

        // Sort: users with messages first (by last message time), then alphabetically
        contacts.sort((a, b) => {
            if (a.lastMessage && b.lastMessage) {
                return new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime();
            }
            if (a.lastMessage) return -1;
            if (b.lastMessage) return 1;
            return a.name.localeCompare(b.name);
        });

        return { success: true, data: contacts };
    }

    /** Get thread between me and another user, mark messages as read */
    @Get('thread/:userId')
    async getThread(@Param('userId') userId: string, @Request() req: any) {
        const me = req.user.id;
        const messages = await this.prisma.chatMessage.findMany({
            where: {
                OR: [
                    { senderId: me, receiverId: userId },
                    { senderId: userId, receiverId: me },
                ],
            },
            orderBy: { createdAt: 'asc' },
            take: 200,
        });

        // Mark incoming as read
        await this.prisma.chatMessage.updateMany({
            where: { senderId: userId, receiverId: me, isRead: false },
            data: { isRead: true },
        });

        return { success: true, data: messages };
    }

    /** Send a message to a specific user */
    @Post('thread/:userId')
    async sendMessage(
        @Param('userId') receiverId: string,
        @Body() dto: SendMessageDto,
        @Request() req: any,
    ) {
        const msg = await this.prisma.chatMessage.create({
            data: {
                senderId: req.user.id,
                receiverId,
                content: dto.content,
            },
        });
        return { success: true, data: msg };
    }
}
