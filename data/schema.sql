CREATE TABLE manufacturers (
    manufacturer_id INTEGER PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    country TEXT
);

CREATE TABLE vehicle_models (
    model_id INTEGER PRIMARY KEY,
    manufacturer_id INTEGER NOT NULL,
    model_name TEXT NOT NULL,
    generation_name TEXT,
    generation_start_year INTEGER,
    generation_end_year INTEGER,
    india_sale_start DATE,
    india_sale_end DATE,
    currently_sold_india INTEGER NOT NULL CHECK (currently_sold_india IN (0, 1)),
    body_style TEXT,
    FOREIGN KEY (manufacturer_id) REFERENCES manufacturers(manufacturer_id),
    UNIQUE (manufacturer_id, model_name, generation_name)
);

CREATE TABLE vehicle_dimensions (
    dimension_id INTEGER PRIMARY KEY,
    model_id INTEGER NOT NULL,
    variant_scope TEXT NOT NULL DEFAULT 'all_variants',
    effective_from DATE,
    effective_to DATE,
    length_mm REAL,
    width_body_mm REAL NOT NULL,
    width_mirrors_folded_mm REAL,
    width_mirrors_open_mm REAL,
    height_mm REAL,
    wheelbase_mm REAL,
    source_id INTEGER NOT NULL,
    source_definition_text TEXT,
    mirror_exclusion_confirmed INTEGER NOT NULL DEFAULT 0 CHECK (mirror_exclusion_confirmed IN (0, 1)),
    verification_status TEXT NOT NULL CHECK (verification_status IN ('unverified', 'single_source', 'cross_checked', 'manufacturer_confirmed')),
    verified_at DATETIME,
    FOREIGN KEY (model_id) REFERENCES vehicle_models(model_id),
    FOREIGN KEY (source_id) REFERENCES sources(source_id)
);

CREATE TABLE sources (
    source_id INTEGER PRIMARY KEY,
    source_type TEXT NOT NULL CHECK (source_type IN ('manufacturer_brochure', 'manufacturer_webpage', 'type_approval', 'secondary_database', 'manual_measurement')),
    publisher TEXT NOT NULL,
    title TEXT NOT NULL,
    url TEXT,
    document_date DATE,
    accessed_at DATETIME NOT NULL,
    archived_url TEXT,
    notes TEXT
);

CREATE TABLE vehicle_aliases (
    alias_id INTEGER PRIMARY KEY,
    model_id INTEGER NOT NULL,
    alias TEXT NOT NULL,
    alias_type TEXT NOT NULL CHECK (alias_type IN ('badge', 'ocr', 'classifier_label', 'legacy_name')),
    FOREIGN KEY (model_id) REFERENCES vehicle_models(model_id)
);

CREATE INDEX idx_model_current_india ON vehicle_models(currently_sold_india);
CREATE INDEX idx_alias_lookup ON vehicle_aliases(alias);
CREATE INDEX idx_dimensions_model_dates ON vehicle_dimensions(model_id, effective_from, effective_to);
