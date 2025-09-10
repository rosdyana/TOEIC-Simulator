// AI Image Recognition Guidelines and Tips for Better Results

export const AI_GUIDELINES = {
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
    title: "AI Processing Information",
    notes: [
      "AI processing typically takes 3-10 seconds per image",
      "Processing time depends on image complexity and AI provider",
      "Progress is shown during processing",
      "Processing uses cloud-based AI services"
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
