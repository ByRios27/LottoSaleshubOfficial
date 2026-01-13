// This file contains type definitions shared between the client and server for the Results feature.

// Represents a single winning hit within a ticket.
export type WinnerHit = {
    position: "1ero" | "2do" | "3ro";
    number: string;
    rate: number;
    quantity: number;
    amount: number;
};

// Represents a winning ticket with all its hits.
export type Winner = {
    ticketId: string;
    clientName?: string;
    clientPhone?: string;
    hits: WinnerHit[];
    totalWin: number;
};

// Represents a lottery result saved in the database.
export type SavedResult = {
    id: string;
    drawId: string;
    date: string;       // Format: "YYYY-MM-DD"
    schedule: string;
    first: string;
    second: string;
    third: string;
    createdAt?: any;    // Should be a string in ISO format for the client
};