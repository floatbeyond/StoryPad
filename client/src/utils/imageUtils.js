const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const DEFAULT_COVER = `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/default-cover.png`;

export const handleImageError = (event) => {
  const img = event.currentTarget;
  if (img.src !== DEFAULT_COVER) {
    img.src = DEFAULT_COVER;
  }
};

export const getImageWithFallback = (src) => {
  return src || DEFAULT_COVER;
};

export { DEFAULT_COVER };
