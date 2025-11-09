import Image, { ImageProps } from "next/image";

type Props = Omit<ImageProps, "layout" | "objectFit"> & { sizesFixed?: string };

export default function AppImage({ className, sizes, sizesFixed, ...rest }: Props) {
  // sizes default "responsivo" seguro; sizesFixed para contenedores fijos (avatars)
  const finalSizes = sizesFixed ?? sizes ?? "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw";

  return <Image {...rest} sizes={finalSizes} className={className} />;
}
