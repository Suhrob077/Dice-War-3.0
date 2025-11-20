// components/FallbackImage.jsx
import React from "react";

export default function FallbackImage({ src, alt = "", className = "", fallback = "../../public/0e433298-a3dd-4137-9c9d-1d67d9125156_removalai_preview.png", ...props }) {
  const [imgSrc, setImgSrc] = React.useState(src);

  return (
    <img
      src={imgSrc}
      alt={alt}
      className={className}
      {...props}
      onError={() => setImgSrc(fallback)}
    />
  );
}
