// RUTA: src/lib/ticket-utils.ts

type TicketItemA = { numero: string; fraccion?: number };
type TicketItemB = { number: string; quantity: number };
type TicketItem = TicketItemA | TicketItemB;

function isItemA(i: TicketItem): i is TicketItemA {
  return "numero" in i;
}

function getNum(i: TicketItem): string {
  return isItemA(i) ? i.numero : i.number;
}

function getQty(i: TicketItem): number | undefined {
  return isItemA(i) ? i.fraccion : i.quantity;
}

interface Ticket {
  id?: string;
  total?: number;
  // OJO: aquí puede venir como items o numbers dependiendo de tu flujo,
  // así que aceptamos ambos opcionalmente:
  items?: TicketItem[];
  numbers?: TicketItem[]; 
}

export const buildWatermarkText = (ticket: Ticket | null): string => {
  if (!ticket) return "LOTTOSALESHUB • DOCUMENTO OFICIAL";

  const ticketId = (ticket.id || "S/ID").toUpperCase();

  const total =
    typeof ticket.total === "number"
      ? ticket.total.toLocaleString("en-US", { style: "currency", currency: "USD" })
      : "$0.00";

  // Unificamos el array venga de items o numbers
  const listSource = (ticket.items?.length ? ticket.items : ticket.numbers) || [];

  let numerosStr = "S/N";
  if (listSource.length > 0) {
    const max = 14; // ajustable
    const slice = listSource.slice(0, max);

    numerosStr = slice
      .map((i) => {
        const n = getNum(i);
        const q = getQty(i);
        return q ? `${n}x${q}` : n;
      })
      .join(" ");

    if (listSource.length > max) {
      numerosStr += ` +${listSource.length - max}`;
    }
  }

  return `${ticketId} • ${total} • ${numerosStr} • ORIGINAL`;
};
