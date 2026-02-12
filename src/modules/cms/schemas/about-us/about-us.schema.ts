import { z } from 'zod'

// About Us content schema
export const aboutUsContentSchema = z.object({
  // Main Image at the top
  main_image_url: z.string().min(1, 'Main image URL is required'),
  main_image_alt_text: z.string().min(1, 'Main image alt text is required'),

  // Section 1
  section1_title: z.string().min(1, 'Section 1 title is required'),
  section1_text: z.string().min(1, 'Section 1 text is required'),
  section1_first_image_url: z.string().min(1, 'Section 1 first image URL is required'),
  section1_first_image_alt_text: z.string().min(1, 'Section 1 first image alt text is required'),
  section1_second_image_url: z.string().min(1, 'Section 1 second image URL is required'),
  section1_second_image_alt_text: z.string().min(1, 'Section 1 second image alt text is required'),
  section1_third_image_url: z.string().min(1, 'Section 1 third image URL is required'),
  section1_third_image_alt_text: z.string().min(1, 'Section 1 third image alt text is required'),

  // Section 2
  section2_title: z.string().min(1, 'Section 2 title is required'),
  section2_text: z.string().min(1, 'Section 2 text is required'),
  section2_first_image_url: z.string().min(1, 'Section 2 first image URL is required'),
  section2_first_image_alt_text: z.string().min(1, 'Section 2 first image alt text is required'),
  section2_second_image_url: z.string().min(1, 'Section 2 second image URL is required'),
  section2_second_image_alt_text: z.string().min(1, 'Section 2 second image alt text is required'),
  section2_third_image_url: z.string().min(1, 'Section 2 third image URL is required'),
  section2_third_image_alt_text: z.string().min(1, 'Section 2 third image alt text is required'),

  // Last Section
  last_section_title: z.string().min(1, 'Last section title is required'),
  last_section_text: z.string().min(1, 'Last section text is required'),
})

// Update schema wraps content
export const updateAboutUsSchema = z.object({
  content: aboutUsContentSchema,
})
