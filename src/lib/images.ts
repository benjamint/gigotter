import type { GigType } from './types'

/**
 * Photo slots. Drop JPGs (≈1600px wide, WebP/JPG) into /public/images with these names.
 * Until a file exists, <Photo> renders a muted placeholder panel.
 */
export const IMG = {
  hero: '/images/hero.jpg',             // student in the city, phone in hand, natural light
  heroAlt: '/images/hero-2.jpg',        // business owner in her shop / salon
  step1: '/images/step-verify.jpg',     // student holding ID / taking selfie
  step2: '/images/step-field.jpg',      // student talking to a shop owner
  step3: '/images/step-paid.jpg',       // phone showing mobile money / smiling student
  business: '/images/business.jpg',     // team / founder at work, for the "hire students" section
  auth: '/images/auth.jpg',             // campus scene, used beside sign-up / login
} as const

export const GIG_COVERS: Record<GigType, string> = {
  onboarding: '/images/gig-onboarding.jpg', // salon / small shop front
  focus_group: '/images/gig-focus-group.jpg', // people around a table talking
  research: '/images/gig-research.jpg',     // market stalls, clipboard
  survey: '/images/gig-survey.jpg',         // person on phone filling a form
  content: '/images/gig-content.jpg',       // phone filming
  other: '/images/gig-other.jpg',
}
