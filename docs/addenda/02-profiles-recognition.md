# User Profile — human identity and recognition

## Experience
A single first-class profile route (`/u/:slug` is the preferred candidate), linked from employee avatars, assignments, mentions, and recognition. A premium, modern spotlight—not a Myspace-style configurable page, follower network, or employee settings form. Hero contains a carefully aligned avatar/photo, name, title, one-line bio, and optional cover/featured work. Follow with a concise work snapshot, curated activity, badges/awards/stickers, and current assignments. Avoid duplicate management dashboards.

## Editing and visibility
Users edit their photo, bio, display name and permitted slug. Team roles, job assignments and performance statistics are derived from core records. Admins control role and recognition taxonomy. Internal visibility is the V1 default until the public/shareable URL policy is approved; a custom URL is not authorization or permission to expose internal job/client details. Private job history, external contact details and worker diagnostic events never appear merely because a user was involved.

## Recognition
Peers/managers can give lightweight stickers and written shoutouts; configured awards can be manager-issued or rule-issued later. Preserve creator, recipient, organization, reason and date. Avoid unverified automated claims, competitive public rankings or rewarding volume over quality. A recognition event appears in Activity and on the person's profile with the same source reference.

## Proposed additions (do not overwrite User schema blindly)
- `UserProfile`: userId, organizationId? [decide whether identity or role scoped], slug, displayName, title, bio, avatarAssetId?, coverAssetId?, visibility, updatedAt. Unique slug within explicitly selected namespace; preserve redirect aliases after rename.
- `RecognitionType`: id, organizationId, name, icon/stickerAssetId?, category, enabled, eligibility.
- `Recognition`: id, organizationId, recipientUserId, giverUserId?, typeId, note?, createdAt, revokedAt?; an Activity event references this record.
- `UserProfileEvent` should **not** be a second source-of-truth table: derive a filtered public-safe projection of permitted Activity events and job facts.
- `UserStatSummary` should be computed or materialized, never manually edited as claimed metrics.

## UX patterns
Avatar + name alignment fixed as a shared identity pattern. User link navigates without a separate people directory. Empty states have useful invitation to add bio or award. Profile photo cropping/editing should be simple. Awards/stickers use compact, tasteful visual artifacts, not a noisy wall of badges.

## Decisions to validate
Slug uniqueness scope (global vs organization), member visibility across companies, exact profile URL, public sharing/SEO, peer award permissions, moderation and sticker catalog. These must be explicit before enabling public URLs.
