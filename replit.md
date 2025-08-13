# Waziper - WhatsApp Marketing Automation Platform

## Overview

Waziper is a comprehensive WhatsApp marketing automation platform built with Node.js/Express and React. It enables businesses to manage bulk messaging campaigns, automated responses, contact management, and WhatsApp session handling through an intuitive web interface. The platform supports advanced features like spintax message variations, scheduled campaigns, chatbots, and detailed analytics.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety and modern development
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **UI Components**: shadcn/ui component library built on Radix UI primitives for accessible, customizable components
- **Styling**: Tailwind CSS with custom design tokens and WhatsApp-themed color variables
- **Build Tool**: Vite for fast development and optimized production builds
- **Form Handling**: React Hook Form with Zod validation for type-safe form management

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules for modern JavaScript features
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **WebSockets**: Built-in WebSocket server for real-time updates (session status, campaign progress)
- **File Upload**: Multer middleware for handling CSV imports and media uploads
- **Session Management**: PostgreSQL sessions with connect-pg-simple
- **Error Handling**: Centralized error handling with @hapi/boom for consistent API responses

### Data Storage Architecture
- **Database**: PostgreSQL as primary database with Neon serverless hosting
- **ORM**: Drizzle ORM with schema-first approach for type safety
- **Schema Design**: 
  - Users table for authentication
  - Contacts with group-based segmentation
  - WhatsApp sessions for multi-account management
  - Campaigns with scheduling and analytics
  - Auto-reply rules with keyword triggers
  - Message queue for rate-limited sending
- **File Storage**: Local filesystem for uploads with configurable storage options

### WhatsApp Integration
- **Library**: @whiskeysockets/baileys for WhatsApp Web API integration
- **Authentication**: Multi-file auth state persistence for session management
- **QR Code**: Dynamic QR code generation for session setup
- **Multi-Session**: Support for multiple WhatsApp accounts with individual session management
- **Message Types**: Support for text, images, videos, documents, and audio files

### Key Services
- **WhatsApp Service**: Manages connections, message sending, and session lifecycle
- **Scheduler Service**: Handles campaign scheduling with cron-based execution and rate limiting
- **Spintax Service**: Processes message variations to avoid spam detection
- **Message Queue**: Rate-limited message processing to respect WhatsApp limits

### Security & Performance
- **Rate Limiting**: Configurable message rate limits (default 30 messages/minute)
- **Session Security**: Secure session storage with configurable timeouts
- **Input Validation**: Zod schemas for API request/response validation
- **Error Boundaries**: Comprehensive error handling on both client and server
- **Real-time Updates**: WebSocket integration for live status updates

## External Dependencies

### Core Infrastructure
- **Database**: Neon PostgreSQL serverless database
- **Authentication**: Custom session-based authentication with PostgreSQL storage

### WhatsApp Integration
- **@whiskeysockets/baileys**: WhatsApp Web API client for message sending and session management
- **qrcode**: QR code generation for WhatsApp session authentication

### Development Tools
- **Drizzle Kit**: Database migration and schema management
- **TypeScript**: Type checking and development tooling
- **ESBuild**: Production build bundling for server code
- **Vite**: Frontend development server and build tool

### File Processing
- **csv-parser**: CSV file parsing for contact imports
- **multer**: File upload handling middleware

### Utility Libraries
- **date-fns**: Date manipulation and formatting
- **node-cron**: Scheduled task execution for campaigns
- **nanoid**: Secure unique ID generation