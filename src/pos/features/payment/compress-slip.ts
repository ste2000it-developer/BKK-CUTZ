function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise(
    (resolve, reject) => {
      const objectUrl =
        URL.createObjectURL(file);

      const image =
        new Image();

      image.onload = () => {
        URL.revokeObjectURL(
          objectUrl
        );

        resolve(image);
      };

      image.onerror = () => {
        URL.revokeObjectURL(
          objectUrl
        );

        reject(
          new Error(
            "ไม่สามารถอ่านรูปสลิปได้"
          )
        );
      };

      image.src = objectUrl;
    }
  );
}

function canvasToJpegBlob(
  canvas: HTMLCanvasElement,
  quality: number
): Promise<Blob> {
  return new Promise(
    (resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(
              new Error(
                "ไม่สามารถเตรียมรูปสลิปได้"
              )
            );
            return;
          }

          resolve(blob);
        },
        "image/jpeg",
        quality
      );
    }
  );
}

export async function compressSlipImage(file: File): Promise<Blob> {
  if (
    !file ||
    !String(file.type || "").startsWith("image/")
  ) {
    throw new Error(
      "กรุณาเลือกไฟล์รูปภาพ"
    );
  }

  const image =
    await loadImageFromFile(file);

  const maxDimension = 1600;

  const sourceWidth =
    image.naturalWidth || image.width;

  const sourceHeight =
    image.naturalHeight || image.height;

  const ratio =
    Math.min(
      1,
      maxDimension /
        Math.max(
          sourceWidth,
          sourceHeight
        )
    );

  const width =
    Math.max(
      1,
      Math.round(
        sourceWidth * ratio
      )
    );

  const height =
    Math.max(
      1,
      Math.round(
        sourceHeight * ratio
      )
    );

  const canvas =
    document.createElement("canvas");

  canvas.width = width;
  canvas.height = height;

  const context =
    canvas.getContext("2d");

  if (!context) {
    throw new Error(
      "อุปกรณ์นี้ไม่สามารถเตรียมรูปสลิปได้"
    );
  }

  context.drawImage(
    image,
    0,
    0,
    width,
    height
  );

  let quality = 0.82;
  let blob =
    await canvasToJpegBlob(
      canvas,
      quality
    );

  const maxBytes =
    5 * 1024 * 1024;

  while (
    blob.size >= maxBytes &&
    quality > 0.52
  ) {
    quality -= 0.08;

    blob =
      await canvasToJpegBlob(
        canvas,
        quality
      );
  }

  if (blob.size >= maxBytes) {
    throw new Error(
      "รูปสลิปมีขนาดใหญ่เกินไป กรุณาถ่ายใหม่"
    );
  }

  return blob;
}
