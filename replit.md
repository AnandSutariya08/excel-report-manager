# SellSync - Multi-Company E-Commerce Management Platform

## Overview
SellSync is a frontend-only React application for managing multi-company e-commerce operations. It provides a unified dashboard for tracking orders, inventory, returns, and analytics across multiple companies and platforms. The app uses Firebase (Firestore + Storage) as its backend.

## Recent Changes
- 2026-02-16: Migrated from Lovable to Replit environment
  - Updated Vite config to bind to port 5000 with allowedHosts
  - Removed lovable-tagger plugin dependency
  - Fixed CSS import order in index.css

## Project Architecture
- **Frontend**: React 18 + TypeScript + Vite
- **UI**: Shadcn/UI components + Tailwind CSS
- **Routing**: react-router-dom v6
- **State Management**: React Context (AuthContext, DataContext) + TanStack React Query
- **Backend**: Firebase Firestore (database named 'zaiko') + Firebase Storage
- **Auth**: Custom username/password auth (demo: admin/123)

## File Structure
- `src/pages/` - Page components (Dashboard, Companies, Orders, Inventory, Returns, Upload, Analytics, Downloads, etc.)
- `src/components/` - Reusable components (layout, UI, dashboard, orders)
- `src/contexts/` - AuthContext and DataContext
- `src/lib/` - Firebase config, utilities, master file services
- `src/hooks/` - Custom hooks

## Key Dependencies
- firebase (Firestore + Storage)
- react-router-dom
- recharts (charts)
- xlsx (Excel file handling)
- shadcn/ui components

## User Preferences
- (none yet)
