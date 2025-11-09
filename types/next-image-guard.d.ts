import "next/image";
declare module "next/image" {
  interface ImageProps {
    // @ts-expect-error Props deprecadas (bloquear)
    layout?: never;
    // @ts-expect-error Props deprecadas (bloquear)
    objectFit?: never;
  }
}
