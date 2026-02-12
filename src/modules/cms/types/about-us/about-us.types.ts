// About Us CMS Section Types

export interface AboutUsContent {
  // Main Image at the top
  main_image_url: string
  main_image_alt_text: string

  // Section 1
  section1_title: string
  section1_text: string
  section1_first_image_url: string
  section1_first_image_alt_text: string
  section1_second_image_url: string
  section1_second_image_alt_text: string
  section1_third_image_url: string
  section1_third_image_alt_text: string

  // Section 2
  section2_title: string
  section2_text: string
  section2_first_image_url: string
  section2_first_image_alt_text: string
  section2_second_image_url: string
  section2_second_image_alt_text: string
  section2_third_image_url: string
  section2_third_image_alt_text: string

  // Last Section
  last_section_title: string
  last_section_text: string
}
