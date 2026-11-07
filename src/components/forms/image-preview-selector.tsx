"use client";

import { ImagePlus, Trash2 } from "lucide-react";
import NextImage from "next/image";
import { useEffect, useRef, useState, type ChangeEvent } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PreviewImage {
  id: string;
  name: string;
  url: string;
}

const MAX_IMAGES = 8;

interface ImagePreviewSelectorProps {
  inputId?: string;
  className?: string;
}

/**
 * Browser-only image preview. Files never leave the page; object URLs are
 * revoked when previews are removed or the form unmounts.
 */
export function ImagePreviewSelector({
  inputId = "property-images",
  className,
}: ImagePreviewSelectorProps) {
  const [images, setImages] = useState<PreviewImage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const imagesRef = useRef<PreviewImage[]>([]);

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  useEffect(() => {
    return () => {
      for (const image of imagesRef.current) {
        URL.revokeObjectURL(image.url);
      }
    };
  }, []);

  function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (files.length === 0) {
      return;
    }

    const invalid = files.find((file) => !file.type.startsWith("image/"));
    if (invalid) {
      setError(`"${invalid.name}" is not an image file.`);
      return;
    }

    const remaining = MAX_IMAGES - images.length;
    if (remaining <= 0) {
      setError(`You can preview up to ${MAX_IMAGES} images.`);
      return;
    }

    const accepted = files.slice(0, remaining).map((file) => ({
      id: `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
      name: file.name,
      url: URL.createObjectURL(file),
    }));

    setImages((current) => [...current, ...accepted]);
    setError(
      files.length > remaining
        ? `Only ${remaining} more image${remaining === 1 ? "" : "s"} could be added.`
        : null,
    );
  }

  function removeImage(id: string) {
    setImages((current) => {
      const target = current.find((image) => image.id === id);
      if (target) {
        URL.revokeObjectURL(target.url);
      }

      return current.filter((image) => image.id !== id);
    });
    setError(null);
  }

  return (
    <div className={cn("space-y-3", className)}>
      <label
        htmlFor={inputId}
        className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 px-5 py-8 text-center transition-colors hover:border-primary/40 hover:bg-muted/50 focus-within:ring-[3px] focus-within:ring-ring/20"
      >
        <span className="flex size-10 items-center justify-center rounded-full bg-accent text-primary">
          <ImagePlus aria-hidden="true" className="size-5" />
        </span>
        <span className="mt-3 text-sm font-medium text-foreground">
          Select property images
        </span>
        <span className="mt-1 text-xs text-muted-foreground">
          JPG, PNG, WebP, or other image files · up to {MAX_IMAGES} previews
        </span>
        <input
          id={inputId}
          name="images"
          type="file"
          accept="image/*"
          multiple
          onChange={handleFiles}
          className="sr-only"
        />
      </label>

      <p className="text-xs leading-relaxed text-muted-foreground">
        Preview only — selected files are not uploaded or stored. Image storage
        will be connected with the backend in a later phase.
      </p>

      {error ? (
        <p role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      ) : null}

      {images.length > 0 ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {images.map((image) => (
            <li
              key={image.id}
              className="group relative overflow-hidden rounded-lg border border-border bg-muted"
            >
              <div className="relative aspect-[4/3]">
                <NextImage
                  src={image.url}
                  alt={`Preview of ${image.name}`}
                  fill
                  unoptimized
                  sizes="(min-width: 640px) 25vw, 50vw"
                  className="object-cover"
                />
              </div>
              <div className="flex items-center justify-between gap-2 border-t border-border bg-card px-2 py-1.5">
                <span
                  className="truncate text-[11px] text-muted-foreground"
                  title={image.name}
                >
                  {image.name}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => removeImage(image.id)}
                  aria-label={`Remove ${image.name}`}
                  className="size-6 shrink-0 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 aria-hidden="true" className="size-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
