-- Chennai Real Estates
-- Seed data for the initial schema.
--
-- All records below come from the existing TypeScript demo data. IDs, slugs,
-- prices, statuses, verification/approval states, WhatsApp references,
-- locality labels, lead statuses/sources, activity IDs and timestamps are
-- preserved exactly.
--
-- The script is idempotent:
--   * areas, properties, leads and activities use ON CONFLICT DO NOTHING;
--   * notes are inserted only when their lead has no notes yet, so broker
--     edits/additions are not overwritten or duplicated.
--
-- Run after the initial migration. Seed inserts run as the migration owner and
-- are therefore not blocked by RLS.

-- ---------------------------------------------------------------------------
-- Areas (4)
-- ---------------------------------------------------------------------------

insert into public.areas (
  slug, name, pincode, summary, description, highlights, parent_area, is_active
) values (
  'madipakkam',
  'Madipakkam',
  '600091',
  'A well-connected residential neighbourhood with a strong mix of family apartments, independent homes, and local conveniences.',
  'Madipakkam sits between Velachery and Pallikaranai, with easy access to the Velachery MRTS, OMR, and the everyday markets along Medavakkam Main Road. The neighbourhood suits families looking for established schools, hospitals, and a manageable commute.',
  array[
    'Strong rental demand from working professionals',
    'Walkable local markets and everyday services',
    'Easy access to Velachery and the OMR corridor'
  ],
  'Chennai',
  true
)
on conflict (slug) do nothing;

insert into public.areas (
  slug, name, pincode, summary, description, highlights, parent_area, is_active
) values (
  'keelkattalai',
  'Keelkattalai',
  '600117',
  'A settled residential pocket known for independent houses, quieter streets, and good access to Madipakkam.',
  'Keelkattalai is a largely residential area with a mix of older independent homes and newer apartment projects. It offers a calmer pace than the main Velachery–Madipakkam stretch while keeping schools, temples, and daily shopping close at hand.',
  array[
    'Quieter residential streets',
    'Good stock of independent houses',
    'Close to Madipakkam and Medavakkam'
  ],
  'Chennai',
  true
)
on conflict (slug) do nothing;

insert into public.areas (
  slug, name, pincode, summary, description, highlights, parent_area, is_active
) values (
  'pallikaranai',
  'Pallikaranai',
  '600100',
  'A fast-growing residential belt with newer apartment communities and direct access to the OMR IT corridor.',
  'Pallikaranai has seen steady residential growth around its marshland and along the Medavakkam–Sholinganallur road. It is a practical choice for buyers who want newer construction and a shorter commute toward the IT corridor.',
  array[
    'Newer apartment projects',
    'Direct access to OMR',
    'Wide choice of schools and hospitals nearby'
  ],
  'Chennai',
  true
)
on conflict (slug) do nothing;

insert into public.areas (
  slug, name, pincode, summary, description, highlights, parent_area, is_active
) values (
  'velachery',
  'Velachery',
  '600042',
  'A busy, established hub with excellent retail, transit links, and a wide range of rental homes.',
  'Velachery is one of south Chennai''s main commercial and residential hubs, anchored by the MRTS terminus, Phoenix Marketcity, and a dense network of shops and services. It is a convenient base for professionals who value connectivity over quiet streets.',
  array[
    'MRTS and bus connectivity',
    'Malls, restaurants, and daily conveniences',
    'Large rental market for families and professionals'
  ],
  'Chennai',
  true
)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- Properties (9)
-- ---------------------------------------------------------------------------

insert into public.properties (
  id, slug, title, summary, description, public_description, type, configuration,
  listing_type, status, price, bedrooms, bathrooms, built_up_area_sqft,
  facing, has_lift, parking, area_slug, locality, features, is_featured,
  listed_at, updated_at
) values (
  'MAD-0001',
  'sunlit-3bhk-apartment-madipakkam',
  'Sunlit 3BHK apartment with covered parking',
  'A well-planned 3BHK in Madipakkam with cross ventilation, covered parking, and a quiet internal layout.',
  array[
    'This east-facing apartment makes the most of its corner position, with windows on two sides and a bright living-dining area. The three bedrooms are well separated from the main living space, which makes the layout comfortable for a family.',
    'The building has a lift, power backup for common areas, and dedicated covered parking. Schools, daily shopping, and the Madipakkam bus depot are all within a short drive.'
  ],
  array[
    'This east-facing apartment makes the most of its corner position, with windows on two sides and a bright living-dining area. The three bedrooms are well separated from the main living space, which makes the layout comfortable for a family.',
    'The building has a lift, power backup for common areas, and dedicated covered parking. Schools, daily shopping, and the Madipakkam bus depot are all within a short drive.'
  ],
  'apartment',
  '3-bhk',
  'sale',
  'available',
  12500000,
  3,
  2,
  1450,
  'east',
  true,
  'Covered car parking',
  'madipakkam',
  'Madipakkam',
  array[
    'Covered car parking',
    'Lift and common-area power backup',
    'Modular kitchen',
    'Piped gas connection',
    'Borewell and metro water',
    'Children''s play area'
  ],
  true,
  date '2026-10-18',
  date '2026-11-02'
)
on conflict do nothing;

insert into public.properties (
  id, slug, title, summary, description, public_description, type, configuration,
  listing_type, status, price, bedrooms, bathrooms, built_up_area_sqft,
  floor, parking, area_slug, locality, features, is_featured,
  listed_at, updated_at
) values (
  'MAD-0002',
  '2bhk-rental-near-madipakkam-main-road',
  '2BHK rental close to Madipakkam main road',
  'A practical, well-maintained 2BHK for rent with easy access to shops, buses, and the Madipakkam main road.',
  array[
    'A compact and well-maintained 2BHK on the second floor of a small, quiet building. The living room opens to a covered balcony, and both bedrooms have built-in wardrobes.',
    'The home is best suited to a small family or working couple. Two-wheeler parking is included, and the main road, bus stops, and supermarkets are within walking distance.'
  ],
  array[
    'A compact and well-maintained 2BHK on the second floor of a small, quiet building. The living room opens to a covered balcony, and both bedrooms have built-in wardrobes.',
    'The home is best suited to a small family or working couple. Two-wheeler parking is included, and the main road, bus stops, and supermarkets are within walking distance.'
  ],
  'apartment',
  '2-bhk',
  'rent',
  'available',
  28000,
  2,
  2,
  1050,
  'Second floor',
  'Covered two-wheeler parking',
  'madipakkam',
  'Madipakkam',
  array[
    'Covered two-wheeler parking',
    'Built-in wardrobes',
    'Covered balcony',
    'Borewell water',
    'Walking distance to bus stop',
    'Family or working couple preferred'
  ],
  false,
  date '2026-10-25',
  date '2026-11-04'
)
on conflict do nothing;

insert into public.properties (
  id, slug, title, summary, description, public_description, type, configuration,
  listing_type, status, price, bedrooms, bathrooms, built_up_area_sqft,
  parking, area_slug, locality, features, is_featured,
  listed_at, updated_at
) values (
  'MAD-0003',
  'independent-3bhk-house-keelkattalai',
  'Independent 3BHK house on a quiet Keelkattalai street',
  'A spacious independent house with a private terrace, ground-floor parking, and room for a small garden.',
  array[
    'This independent house is set back from the road and offers a rare combination of space and privacy in Keelkattalai. The ground floor has a large living and dining area, a bedroom, and a kitchen with a utility area.',
    'Two further bedrooms and a family lounge occupy the first floor. The terrace is open and well suited to a small garden or seating area. The property is within a short drive of Madipakkam and Medavakkam.'
  ],
  array[
    'This independent house is set back from the road and offers a rare combination of space and privacy in Keelkattalai. The ground floor has a large living and dining area, a bedroom, and a kitchen with a utility area.',
    'Two further bedrooms and a family lounge occupy the first floor. The terrace is open and well suited to a small garden or seating area. The property is within a short drive of Madipakkam and Medavakkam.'
  ],
  'independent-house',
  '3-bhk',
  'sale',
  'available',
  16500000,
  3,
  3,
  1800,
  'Ground-floor car parking',
  'keelkattalai',
  'Keelkattalai',
  array[
    'Private terrace',
    'Ground-floor car parking',
    'Three attached bathrooms',
    'Utility area',
    'Borewell and metro water',
    'Quiet residential street'
  ],
  false,
  date '2026-10-12',
  date '2026-10-30'
)
on conflict do nothing;

insert into public.properties (
  id, slug, title, summary, description, public_description, type, configuration,
  listing_type, status, price, bedrooms, bathrooms, built_up_area_sqft,
  parking, area_slug, locality, features, is_featured,
  listed_at, updated_at
) values (
  'MAD-0004',
  'compact-2bhk-pallikaranai',
  'Compact 2BHK in a newer Pallikaranai community',
  'A bright, low-maintenance 2BHK in a newer gated community with shared amenities and OMR access.',
  array[
    'A thoughtfully laid out 2BHK in a newer community, ideal for a first home or a small family. The apartment has an open kitchen, a compact utility balcony, and good natural light through the day.',
    'Residents have access to shared parking, a children''s play area, and a community hall. The OMR and the Medavakkam junction are both a straightforward drive away.'
  ],
  array[
    'A thoughtfully laid out 2BHK in a newer community, ideal for a first home or a small family. The apartment has an open kitchen, a compact utility balcony, and good natural light through the day.',
    'Residents have access to shared parking, a children''s play area, and a community hall. The OMR and the Medavakkam junction are both a straightforward drive away.'
  ],
  'apartment',
  '2-bhk',
  'sale',
  'available',
  7800000,
  2,
  2,
  980,
  'Covered parking',
  'pallikaranai',
  'Pallikaranai',
  array[
    'Gated community',
    'Shared children''s play area',
    'Community hall',
    'Open kitchen',
    'Covered parking',
    'Quick access to OMR'
  ],
  false,
  date '2026-10-08',
  date '2026-11-01'
)
on conflict do nothing;

insert into public.properties (
  id, slug, title, summary, description, public_description, type, configuration,
  listing_type, status, price, bedrooms, bathrooms, built_up_area_sqft,
  has_lift, parking, furnishing, area_slug, locality, features, is_featured,
  listed_at, updated_at
) values (
  'MAD-0005',
  '3bhk-rental-velachery',
  'Spacious 3BHK rental near Velachery MRTS',
  'A family-sized rental close to Velachery MRTS, with a semi-furnished interior and covered parking.',
  array[
    'This semi-furnished 3BHK is a practical option for a family that wants to be close to transit and everyday conveniences. The living-dining area is generous, and the kitchen has a separate utility balcony.',
    'The apartment comes with wardrobes, a modular kitchen, and covered car parking. Velachery MRTS, Phoenix Marketcity, and the main bus routes are nearby.'
  ],
  array[
    'This semi-furnished 3BHK is a practical option for a family that wants to be close to transit and everyday conveniences. The living-dining area is generous, and the kitchen has a separate utility balcony.',
    'The apartment comes with wardrobes, a modular kitchen, and covered car parking. Velachery MRTS, Phoenix Marketcity, and the main bus routes are nearby.'
  ],
  'apartment',
  '3-bhk',
  'rent',
  'available',
  45000,
  3,
  2,
  1320,
  true,
  'Covered car parking',
  'semi-furnished',
  'velachery',
  'Velachery',
  array[
    'Semi-furnished with wardrobes',
    'Modular kitchen',
    'Covered car parking',
    'Lift and power backup',
    'Near Velachery MRTS',
    'Family preferred'
  ],
  false,
  date '2026-10-28',
  date '2026-11-05'
)
on conflict do nothing;

insert into public.properties (
  id, slug, title, summary, description, public_description, type,
  listing_type, status, price, built_up_area_sqft,
  area_slug, locality, features, is_featured,
  listed_at, updated_at
) values (
  'MAD-0006',
  'residential-plot-madipakkam',
  'Residential plot in a quiet Madipakkam lane',
  'A clear, rectangular plot on an internal lane, suitable for a compact independent home.',
  array[
    'A rectangular residential plot on a quiet internal lane in Madipakkam. The approach road is well maintained, and the plot has clear boundaries on all four sides.',
    'The location is convenient for a self-built home, with schools, shops, and public transport within a short distance. Documentation can be reviewed with the broker during a site visit.'
  ],
  array[
    'A rectangular residential plot on a quiet internal lane in Madipakkam. The approach road is well maintained, and the plot has clear boundaries on all four sides.',
    'The location is convenient for a self-built home, with schools, shops, and public transport within a short distance. Documentation can be reviewed with the broker during a site visit.'
  ],
  'plot',
  'sale',
  'under-offer',
  14000000,
  1200,
  'madipakkam',
  'Madipakkam',
  array[
    'Clear, rectangular boundary',
    'Internal residential lane',
    'Approach road in good condition',
    'Suitable for an independent home',
    'Close to schools and shops',
    'Site visit by appointment'
  ],
  false,
  date '2026-09-30',
  date '2026-10-27'
)
on conflict do nothing;

insert into public.properties (
  id, slug, title, summary, description, public_description, type, configuration,
  listing_type, status, price, price_negotiable, bedrooms, bathrooms,
  floor, facing, landmark, brokerage, area_slug, locality, features,
  is_featured, verification_status, whatsapp_reference, listed_at, updated_at
) values (
  'MAD-0007',
  '2bhk-lease-home-ponniamman-kovil-madipakkam',
  '2BHK lease home near Ponniamman Kovil, Madipakkam',
  'A 2BHK lease listing in Madipakkam near Ponniamman Kovil, on the second floor and facing east.',
  array[
    'This 2BHK is offered on lease in Madipakkam, near Ponniamman Kovil. The listing notes a second-floor position, east-facing orientation, one bathroom, and a 2% brokerage.',
    'The lease amount is ₹15,00,000 and is marked negotiable. This is an unverified sample entry from the broker''s 31-10-26-35 WhatsApp reference; confirm the current availability, exact lease terms, and all property details directly with Chennai Real Estates.'
  ],
  array[
    'This 2BHK is offered on lease in Madipakkam, near Ponniamman Kovil. The listing notes a second-floor position, east-facing orientation, one bathroom, and a 2% brokerage.',
    'The lease amount is ₹15,00,000 and is marked negotiable. This is an unverified sample entry from the broker''s  WhatsApp reference; confirm the current availability, exact lease terms, and all property details directly with Chennai Real Estates.'
  ],
  'apartment',
  '2-bhk',
  'lease',
  'available',
  1500000,
  true,
  2,
  1,
  'Second floor',
  'east',
  'Near Ponniamman Kovil',
  '2%',
  'madipakkam',
  'Madipakkam',
  array[
    'Second floor',
    'East facing',
    'Near Ponniamman Kovil',
    '2% brokerage'
  ],
  true,
  'sample',
  '31-10-26-35',
  date '2026-10-31',
  date '2026-10-31'
)
on conflict do nothing;

insert into public.properties (
  id, slug, title, summary, description, public_description, type, configuration,
  listing_type, status, price, floor, facing, landmark, brokerage,
  area_slug, locality, features, is_featured, verification_status,
  whatsapp_reference, listed_at, updated_at
) values (
  'MAD-0008',
  '1rk-lease-home-ponniamman-kovil-madipakkam',
  '1RK lease home near Ponniamman Kovil, Madipakkam',
  'A 1RK lease listing in Madipakkam near Ponniamman Kovil, on the second floor and facing west.',
  array[
    'This 1RK home is offered on lease in Madipakkam, near Ponniamman Kovil. The broker''s listing notes a second-floor position, west-facing orientation, and a 2% brokerage.',
    'The lease amount is ₹7,00,000. This is an unverified sample entry from the broker''s 31-10-26-36 WhatsApp reference; confirm the current availability, exact lease terms, and all property details directly with Chennai Real Estates.'
  ],
  array[
    'This 1RK home is offered on lease in Madipakkam, near Ponniamman Kovil. The broker''s listing notes a second-floor position, west-facing orientation, and a 2% brokerage.',
    'The lease amount is ₹7,00,000. This is an unverified sample entry from the broker''s  WhatsApp reference; confirm the current availability, exact lease terms, and all property details directly with Chennai Real Estates.'
  ],
  'apartment',
  '1-rk',
  'lease',
  'available',
  700000,
  'Second floor',
  'west',
  'Near Ponniamman Kovil',
  '2%',
  'madipakkam',
  'Madipakkam',
  array[
    '1 RK layout',
    'Second floor',
    'West facing',
    'Near Ponniamman Kovil',
    '2% brokerage'
  ],
  false,
  'sample',
  '31-10-26-36',
  date '2026-10-31',
  date '2026-10-31'
)
on conflict do nothing;

insert into public.properties (
  id, slug, title, summary, description, public_description, type, configuration,
  listing_type, status, price, bedrooms, built_up_area_sqft, uds_sqft,
  floor, facing, building_age_years, has_lift, approval_status,
  availability_note, area_slug, locality, features, is_featured,
  verification_status, whatsapp_reference, listed_at, updated_at
) values (
  'MAD-0009',
  '2bhk-resale-flat-guperan-nagar-madipakkam',
  '2BHK resale flat in Guperan Nagar, Madipakkam',
  'A 2BHK resale flat in Guperan Nagar, Madipakkam, with 1,000 sq ft built-up area and 507 sq ft UDS.',
  array[
    'This 2BHK resale flat is in Guperan Nagar, Madipakkam. The listing notes a built-up area of 1,000 sq ft, 507 sq ft UDS, a second-floor position, north-facing orientation, no lift, and an approximate building age of 10 years.',
    'The flat is marked ready to move and is listed as unapproved. This is an unverified sample entry from the broker''s 04-11-26-11 WhatsApp reference; confirm the approval status, documents, and current availability directly with Chennai Real Estates before proceeding.'
  ],
  array[
    'This 2BHK resale flat is in Guperan Nagar, Madipakkam. The listing notes a built-up area of 1,000 sq ft, 507 sq ft UDS, a second-floor position, north-facing orientation, no lift, and an approximate building age of 10 years.',
    'The flat is marked ready to move and is listed as unapproved. This is an unverified sample entry from the broker''s  WhatsApp reference; confirm the approval status, documents, and current availability directly with Chennai Real Estates before proceeding.'
  ],
  'apartment',
  '2-bhk',
  'sale',
  'available',
  4500000,
  2,
  1000,
  507,
  'Second floor',
  'north',
  10,
  false,
  'unapproved',
  'Ready to move',
  'madipakkam',
  'Guperan Nagar, Madipakkam',
  array[
    '2BHK resale flat',
    '1,000 sq ft built-up area',
    '507 sq ft UDS',
    'Second floor',
    'North facing',
    'No lift',
    'Ready to move',
    'Unapproved'
  ],
  true,
  'sample',
  '04-11-26-11',
  date '2026-11-04',
  date '2026-11-04'
)
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Leads (7)
-- ---------------------------------------------------------------------------

insert into public.leads (
  id, name, phone, email, message, property_id, status, source,
  created_at, is_demo
) values (
  'LEAD-1001',
  'Demo — Priya R.',
  '+91 90000 10001',
  'demo.priya@example.com',
  'Demo enquiry: interested in the 3BHK at Madipakkam. This sample record exists only to preview the admin inbox.',
  'MAD-0001',
  'new',
  'property-enquiry',
  timestamptz '2026-11-06 09:15:00+05:30',
  true
)
on conflict (id) do nothing;

insert into public.leads (
  id, name, phone, email, message, property_id, status, source,
  created_at, is_demo
) values (
  'LEAD-1002',
  'Demo — Karthik S.',
  '+91 90000 10002',
  null,
  'Demo enquiry: asked about the lease amount and brokerage for the 2BHK near Ponniamman Kovil.',
  'MAD-0007',
  'contacted',
  'whatsapp',
  timestamptz '2026-11-05 17:40:00+05:30',
  true
)
on conflict (id) do nothing;

insert into public.leads (
  id, name, phone, email, message, property_id, status, source,
  created_at, is_demo
) values (
  'LEAD-1003',
  'Demo — Meera V.',
  '+91 90000 10003',
  'demo.meera@example.com',
  'Demo enquiry: wants to visit the unapproved resale flat in Guperan Nagar this weekend.',
  'MAD-0009',
  'visit-scheduled',
  'website-form',
  timestamptz '2026-11-04 12:20:00+05:30',
  true
)
on conflict (id) do nothing;

insert into public.leads (
  id, name, phone, email, message, property_id, status, source,
  created_at, is_demo
) values (
  'LEAD-1004',
  'Demo — Arun P.',
  '+91 90000 10004',
  null,
  'Demo enquiry: discussing the price for the independent house in Keelkattalai.',
  'MAD-0003',
  'negotiation',
  'phone',
  timestamptz '2026-11-02 15:05:00+05:30',
  true
)
on conflict (id) do nothing;

insert into public.leads (
  id, name, phone, email, message, property_id, status, source,
  created_at, is_demo
) values (
  'LEAD-1005',
  'Demo — Nisha K.',
  '+91 90000 10005',
  'demo.nisha@example.com',
  'Demo enquiry: completed the rental discussion for the 2BHK on Madipakkam main road.',
  'MAD-0002',
  'converted',
  'property-enquiry',
  timestamptz '2026-10-28 11:30:00+05:30',
  true
)
on conflict (id) do nothing;

insert into public.leads (
  id, name, phone, email, message, property_id, status, source,
  created_at, is_demo
) values (
  'LEAD-1006',
  'Demo — Suresh M.',
  '+91 90000 10006',
  null,
  'Demo enquiry: asked about the residential plot, then decided to postpone the purchase.',
  'MAD-0006',
  'closed-lost',
  'website-form',
  timestamptz '2026-10-24 08:50:00+05:30',
  true
)
on conflict (id) do nothing;

insert into public.leads (
  id, name, phone, email, message, property_id, status, source,
  created_at, is_demo
) values (
  'LEAD-1007',
  'Demo — Vikram J.',
  '+91 90000 10007',
  'demo.vikram@example.com',
  'Demo enquiry: general question about renting in Madipakkam, with no specific property selected.',
  null,
  'new',
  'website-form',
  timestamptz '2026-11-07 08:10:00+05:30',
  true
)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Lead notes (4)
--
-- Source notes have no timestamps, so created_at uses the default (the moment
-- the seed runs). A note is inserted only when its lead has no notes yet, so a
-- rerun does not duplicate or re-add a note after broker edits.
-- ---------------------------------------------------------------------------

insert into public.lead_notes (lead_id, body)
select seed.lead_id, seed.body
from (
  values
    ('LEAD-1002', 'Sample note: broker replied with the lease terms on 6 Nov.'),
    ('LEAD-1003', 'Sample note: visit proposed for Saturday at 11:00 AM.'),
    ('LEAD-1004', 'Sample note: customer asked whether the price is negotiable.'),
    ('LEAD-1005', 'Sample note: marked converted for the interface preview.')
) as seed(lead_id, body)
where not exists (
  select 1
  from public.lead_notes existing
  where existing.lead_id = seed.lead_id
);

-- ---------------------------------------------------------------------------
-- Lead activities (11)
-- ---------------------------------------------------------------------------

insert into public.lead_activities (
  id, lead_id, occurred_at, label, detail
) values (
  'ACT-1001-1',
  'LEAD-1001',
  timestamptz '2026-11-06 09:15:00+05:30',
  'Enquiry received',
  'Seeded demo enquiry from the property page.'
)
on conflict (id) do nothing;

insert into public.lead_activities (
  id, lead_id, occurred_at, label, detail
) values (
  'ACT-1002-1',
  'LEAD-1002',
  timestamptz '2026-11-05 17:40:00+05:30',
  'Enquiry received',
  null
)
on conflict (id) do nothing;

insert into public.lead_activities (
  id, lead_id, occurred_at, label, detail
) values (
  'ACT-1002-2',
  'LEAD-1002',
  timestamptz '2026-11-06 10:05:00+05:30',
  'Contacted customer',
  'Sample activity — terms shared over WhatsApp.'
)
on conflict (id) do nothing;

insert into public.lead_activities (
  id, lead_id, occurred_at, label, detail
) values (
  'ACT-1003-1',
  'LEAD-1003',
  timestamptz '2026-11-04 12:20:00+05:30',
  'Enquiry received',
  null
)
on conflict (id) do nothing;

insert into public.lead_activities (
  id, lead_id, occurred_at, label, detail
) values (
  'ACT-1003-2',
  'LEAD-1003',
  timestamptz '2026-11-05 09:10:00+05:30',
  'Visit scheduled',
  'Sample activity — Saturday, 11:00 AM.'
)
on conflict (id) do nothing;

insert into public.lead_activities (
  id, lead_id, occurred_at, label, detail
) values (
  'ACT-1004-1',
  'LEAD-1004',
  timestamptz '2026-11-02 15:05:00+05:30',
  'Enquiry received',
  null
)
on conflict (id) do nothing;

insert into public.lead_activities (
  id, lead_id, occurred_at, label, detail
) values (
  'ACT-1005-1',
  'LEAD-1005',
  timestamptz '2026-10-28 11:30:00+05:30',
  'Enquiry received',
  null
)
on conflict (id) do nothing;

insert into public.lead_activities (
  id, lead_id, occurred_at, label, detail
) values (
  'ACT-1005-2',
  'LEAD-1005',
  timestamptz '2026-11-01 16:45:00+05:30',
  'Marked converted',
  null
)
on conflict (id) do nothing;

insert into public.lead_activities (
  id, lead_id, occurred_at, label, detail
) values (
  'ACT-1006-1',
  'LEAD-1006',
  timestamptz '2026-10-24 08:50:00+05:30',
  'Enquiry received',
  null
)
on conflict (id) do nothing;

insert into public.lead_activities (
  id, lead_id, occurred_at, label, detail
) values (
  'ACT-1006-2',
  'LEAD-1006',
  timestamptz '2026-10-30 14:00:00+05:30',
  'Marked closed / lost',
  null
)
on conflict (id) do nothing;

insert into public.lead_activities (
  id, lead_id, occurred_at, label, detail
) values (
  'ACT-1007-1',
  'LEAD-1007',
  timestamptz '2026-11-07 08:10:00+05:30',
  'Enquiry received',
  'Seeded demo enquiry from the contact page.'
)
on conflict (id) do nothing;
