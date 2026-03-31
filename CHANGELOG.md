# Changelog

All notable changes to this project will be documented in this file.

## [2.0.0] - 2026-04-01

### Breaking Changes
- **Auth & Access Control**: Transitioned from a single string role system to a strictly typed Many-to-Many `roles` relation array. User entities now require role mapping structures for authorization checks. Legacy single-string role accesses must be explicitly mapped via array inclusion.

### Added
- **Multi-role Auth**: Users can now hold simultaneous independent roles with composite permissions across UI navigation rendering.
- **Advanced Layout Editor**: Introduced a fully functional canvas layout builder with grouping capabilities, draggable primitive shapes (Circle/Rect), scaling parameters, and explicit Z-index management. 
- **PWA Support**: Added offline caching, mobile icon manifestations, `Standalone Mode` configuration, and a mobile-first UI paradigm centering around a responsive bottom navigation bar.
- **Custom Print Engine**: Re-engineered physical printing logic utilizing an actively generated hidden Iframe layer injected with dynamic CSS resetting rules, allowing flawless zero-margin A4 and F4 (Folio) physical printer scaling independent of browser defaults.
- **Enhanced Security Guards**: Implemented strict role-based guard middleware alongside mobile fallback pages to restrict access conditionally per-device/per-role paradigm.
