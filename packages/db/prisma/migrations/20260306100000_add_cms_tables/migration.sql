-- CMS tables migration
-- Replaces Payload CMS collections with native PostgreSQL tables
-- Uses the same conventions as the rest of the schema:
--   UUID PKs, snake_case, JSONB for bilingual fields, timestamptz

-- ═══════════════════════════════════════════
-- ENUMS
-- ═══════════════════════════════════════════

CREATE TYPE blog_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE comment_status AS ENUM ('pending', 'approved', 'rejected');

-- ═══════════════════════════════════════════
-- BLOG CATEGORIES
-- ═══════════════════════════════════════════

CREATE TABLE blog_categories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        JSONB NOT NULL DEFAULT '{}',  -- {"en":"...", "ar":"..."}
  slug        TEXT NOT NULL UNIQUE,
  description JSONB DEFAULT '{}',
  image       TEXT,
  status      "ContentStatus" NOT NULL DEFAULT 'active',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_blog_categories_status ON blog_categories(status);
CREATE INDEX idx_blog_categories_slug   ON blog_categories(slug);

-- ═══════════════════════════════════════════
-- BLOGS
-- ═══════════════════════════════════════════

CREATE TABLE blogs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id   UUID REFERENCES blog_categories(id) ON DELETE SET NULL,
  title         JSONB NOT NULL DEFAULT '{}',  -- {"en":"...", "ar":"..."}
  slug          TEXT NOT NULL UNIQUE,
  excerpt       JSONB DEFAULT '{}',
  body          JSONB DEFAULT '{}',           -- rich text stored as JSON
  feature_image TEXT,
  tags          TEXT[] DEFAULT '{}',
  seo_title     JSONB DEFAULT '{}',
  seo_desc      JSONB DEFAULT '{}',
  seo_image     TEXT,
  author_id     UUID,                          -- admin user
  status        blog_status NOT NULL DEFAULT 'draft',
  published_at  TIMESTAMPTZ,
  scheduled_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_blogs_status ON blogs(status);
CREATE INDEX idx_blogs_slug   ON blogs(slug);
CREATE INDEX idx_blogs_category ON blogs(category_id);
CREATE INDEX idx_blogs_published ON blogs(published_at DESC);

-- ═══════════════════════════════════════════
-- BLOG COMMENTS
-- ═══════════════════════════════════════════

CREATE TABLE blog_comments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blog_id      UUID NOT NULL REFERENCES blogs(id) ON DELETE CASCADE,
  author_name  TEXT,
  author_email TEXT,
  user_id      UUID,     -- supabase auth user id if logged in
  comment      TEXT NOT NULL,
  status       comment_status NOT NULL DEFAULT 'pending',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_blog_comments_blog   ON blog_comments(blog_id);
CREATE INDEX idx_blog_comments_status ON blog_comments(status);

-- ═══════════════════════════════════════════
-- WIDGETS
-- ═══════════════════════════════════════════

CREATE TABLE widgets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  page_slug   TEXT NOT NULL,   -- 'home', 'about-us', 'contact-us', etc.
  widget_type TEXT NOT NULL,   -- 'hero_banner', 'text_content', 'cta', etc.
  content     JSONB DEFAULT '{}',          -- rich text / bilingual
  image       TEXT,
  link_url    TEXT,
  link_label  JSONB DEFAULT '{}',          -- {"en":"...", "ar":"..."}
  link_new_tab BOOLEAN DEFAULT false,
  extra_data  JSONB DEFAULT '{}',
  sort_order  INT NOT NULL DEFAULT 0,
  status      "ContentStatus" NOT NULL DEFAULT 'active',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_widgets_page   ON widgets(page_slug);
CREATE INDEX idx_widgets_status ON widgets(status);

-- ═══════════════════════════════════════════
-- MENUS
-- ═══════════════════════════════════════════

CREATE TABLE menus (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name      JSONB NOT NULL DEFAULT '{}',
  location  TEXT NOT NULL,   -- 'header', 'footer_1', 'footer_2', etc.
  items     JSONB NOT NULL DEFAULT '[]',   -- array of menu items (nested)
  status    "ContentStatus" NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_menus_location ON menus(location);

-- ═══════════════════════════════════════════
-- EMAIL TEMPLATES
-- ═══════════════════════════════════════════

CREATE TABLE email_templates (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  slug       TEXT NOT NULL UNIQUE,
  subject    JSONB NOT NULL DEFAULT '{}',  -- {"en":"...", "ar":"..."}
  body       JSONB NOT NULL DEFAULT '{}',
  variables  JSONB DEFAULT '[]',           -- [{key,description}]
  status     "ContentStatus" NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_email_templates_slug ON email_templates(slug);

-- ═══════════════════════════════════════════
-- CONTACTS (form submissions)
-- ═══════════════════════════════════════════

CREATE TABLE contacts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  phone      TEXT,
  subject    TEXT,
  message    TEXT NOT NULL,
  is_read    BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_contacts_is_read ON contacts(is_read);

-- ═══════════════════════════════════════════
-- WATERMARKS
-- ═══════════════════════════════════════════

CREATE TABLE watermarks (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image      TEXT NOT NULL,
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════
-- LANGUAGES
-- ═══════════════════════════════════════════

CREATE TABLE languages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  code       TEXT NOT NULL UNIQUE,    -- 'en', 'ar'
  direction  TEXT NOT NULL DEFAULT 'ltr',  -- 'ltr' | 'rtl'
  is_default BOOLEAN NOT NULL DEFAULT false,
  status     "ContentStatus" NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed default languages
INSERT INTO languages (name, code, direction, is_default, status)
VALUES
  ('English', 'en', 'ltr', false, 'active'),
  ('العربية', 'ar', 'rtl', true, 'active');

-- ═══════════════════════════════════════════
-- TRANSLATIONS (UI strings)
-- ═══════════════════════════════════════════

CREATE TABLE translations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lang       TEXT NOT NULL,   -- 'en' | 'ar'
  key        TEXT NOT NULL,   -- 'nav.home', 'btn.bid_now', etc.
  value      TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(lang, key)
);
CREATE INDEX idx_translations_lang ON translations(lang);

-- ═══════════════════════════════════════════
-- SITE SETTINGS (key-value store for dynamic settings)
-- ═══════════════════════════════════════════

CREATE TABLE site_settings (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key        TEXT NOT NULL UNIQUE,
  value      JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed default settings
INSERT INTO site_settings (key, value) VALUES
  ('general', '{"siteName":{"en":"Mzadat","ar":"مزادات"},"siteDescription":{"en":"Oman''s leading online auction platform","ar":"منصة المزادات الإلكترونية الرائدة في عمان"}}'::jsonb),
  ('contact', '{"email":"info@mzadat.om","phone":"+968 2400 0000","whatsapp":"+96824000000","address":{"en":"Muscat, Sultanate of Oman","ar":"مسقط، سلطنة عمان"}}'::jsonb),
  ('social', '{"facebook":"https://facebook.com/mzadat","twitter":"https://twitter.com/mzadat","instagram":"https://instagram.com/mzadat"}'::jsonb),
  ('seo', '{"metaTitle":{"en":"Mzadat — Online Auction Platform","ar":"مزادات — منصة المزادات الإلكترونية"},"metaDescription":{"en":"Oman''s leading online auction platform for vehicles, equipment, and more.","ar":"منصة المزادات الإلكترونية الرائدة في عمان"}}'::jsonb);
