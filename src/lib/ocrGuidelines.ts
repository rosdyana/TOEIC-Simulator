// OCR Guidelines and Tips for Better Recognition

export const OCR_GUIDELINES = {
  imageQuality: {
    title: "Image Quality Requirements",
    tips: [
      "Use high-resolution images (minimum 300 DPI)",
      "Ensure good lighting and contrast",
      "Avoid blurry or distorted images",
      "Use clear, readable fonts",
      "Minimize shadows and reflections"
    ]
  },
  answerSheet: {
    title: "Answer Sheet Format",
    tips: [
      "Use clear numbering (1. A, 2. B, etc.)",
      "Ensure answers are clearly marked",
      "Avoid handwritten answers if possible",
      "Use consistent formatting",
      "Include question numbers"
    ]
  },
  problemImages: {
    title: "Problem Image Format",
    tips: [
      "Include complete questions and all options",
      "Ensure text is clearly visible",
      "Use standard question formats (A), B), C), D))",
      "Avoid overlapping text or images",
      "Include question numbers when possible"
    ]
  },
  supportedFormats: {
    title: "Supported File Formats",
    formats: ["PNG", "JPG", "JPEG", "GIF", "BMP", "WEBP"]
  },
  processingTime: {
    title: "Processing Information",
    notes: [
      "OCR processing typically takes 2-5 seconds per image",
      "Larger images may take longer to process",
      "Progress is shown during processing",
      "Processing happens entirely in your browser"
    ]
  }
};

export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const supportedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/bmp', 'image/webp'];
  
  if (file.size > maxSize) {
    return { valid: false, error: 'File size must be less than 10MB' };
  }
  
  if (!supportedTypes.includes(file.type)) {
    return { valid: false, error: 'Unsupported file format. Please use PNG, JPG, GIF, BMP, or WEBP' };
  }
  
  return { valid: true };
}
