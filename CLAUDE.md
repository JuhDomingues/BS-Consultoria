# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

**Development server:**
```bash
npm run dev
```
Starts the Vite development server on port 8080 with hot reload.

**Build commands:**
```bash
npm run build        # Production build
npm run build:dev    # Development build
npm run preview      # Preview production build
```

**Code quality:**
```bash
npm run lint         # Run ESLint on all files
```

## Project Architecture

This is a React real estate website built with modern tools:

**Core Technologies:**
- React 18 with TypeScript
- Vite for build tooling and development
- React Router DOM for routing
- TanStack Query for data fetching
- Tailwind CSS for styling
- shadcn/ui for UI components

**Project Structure:**
- `/src/pages/` - Main page components (Index, Sobre, NotFound)
- `/src/components/` - Reusable components (Header, Footer, HeroSection, PropertyCard, PropertyCarousel)
- `/src/components/ui/` - shadcn/ui component library
- `/src/hooks/` - Custom React hooks
- `/src/lib/` - Utility functions
- `/src/assets/` - Static images

**Key Architecture Patterns:**
- Component-based architecture with TypeScript
- React Router for client-side routing with catch-all route for 404s
- Mock data pattern for property listings (currently using static data in Index.tsx)
- Mobile-first responsive design with Tailwind CSS
- Path alias `@/` maps to `./src` directory

**Routing Structure:**
- `/` - Main page with property carousels
- `/sobre` - About page
- All undefined routes redirect to NotFound component

**State Management:**
- Local component state with useState
- TanStack Query setup for future API integration
- No global state management currently implemented

**Styling System:**
- Tailwind CSS with custom design tokens
- shadcn/ui components for consistent UI
- Responsive design with mobile navigation
- Custom CSS classes like `cta-glow` for special effects

**Important Notes:**
- Property data is currently mocked in Index.tsx - replace with API calls when backend is ready
- Navigation items in Header.tsx include placeholder routes that may need implementation