# Firestore Composite Indexes
# These indexes support the queries used by the backend API

# Accounts: list by user, sorted by creation date
resource "google_firestore_index" "accounts_uid_createdat" {
  project    = var.project_id
  database   = google_firestore_database.database.name
  collection = "accounts"

  fields {
    field_path = "uid"
    order      = "ASCENDING"
  }
  fields {
    field_path = "createdAt"
    order      = "DESCENDING"
  }
}

# Transactions: list by user, sorted by posted date
resource "google_firestore_index" "transactions_uid_postedat" {
  project    = var.project_id
  database   = google_firestore_database.database.name
  collection = "transactions"

  fields {
    field_path = "uid"
    order      = "ASCENDING"
  }
  fields {
    field_path = "postedAt"
    order      = "DESCENDING"
  }
}

# Transactions: list by user + account, sorted by posted date
resource "google_firestore_index" "transactions_uid_accountid_postedat" {
  project    = var.project_id
  database   = google_firestore_database.database.name
  collection = "transactions"

  fields {
    field_path = "uid"
    order      = "ASCENDING"
  }
  fields {
    field_path = "accountId"
    order      = "ASCENDING"
  }
  fields {
    field_path = "postedAt"
    order      = "DESCENDING"
  }
}

# Transactions: list by user + category, sorted by posted date
resource "google_firestore_index" "transactions_uid_categoryid_postedat" {
  project    = var.project_id
  database   = google_firestore_database.database.name
  collection = "transactions"

  fields {
    field_path = "uid"
    order      = "ASCENDING"
  }
  fields {
    field_path = "categoryId"
    order      = "ASCENDING"
  }
  fields {
    field_path = "postedAt"
    order      = "DESCENDING"
  }
}

# Transactions: list split transactions by user
resource "google_firestore_index" "transactions_uid_issplitparent_postedat" {
  project    = var.project_id
  database   = google_firestore_database.database.name
  collection = "transactions"

  fields {
    field_path = "uid"
    order      = "ASCENDING"
  }
  fields {
    field_path = "isSplitParent"
    order      = "ASCENDING"
  }
  fields {
    field_path = "postedAt"
    order      = "DESCENDING"
  }
}

# Transactions: list manual overrides by user
resource "google_firestore_index" "transactions_uid_manualoverride_postedat" {
  project    = var.project_id
  database   = google_firestore_database.database.name
  collection = "transactions"

  fields {
    field_path = "uid"
    order      = "ASCENDING"
  }
  fields {
    field_path = "manualOverride"
    order      = "ASCENDING"
  }
  fields {
    field_path = "postedAt"
    order      = "DESCENDING"
  }
}

# Transactions: deduplication lookup by txKey
resource "google_firestore_index" "transactions_uid_txkey" {
  project    = var.project_id
  database   = google_firestore_database.database.name
  collection = "transactions"

  fields {
    field_path = "uid"
    order      = "ASCENDING"
  }
  fields {
    field_path = "txKey"
    order      = "ASCENDING"
  }
}

# Transactions: list by import, sorted by posted date
resource "google_firestore_index" "transactions_uid_importid_postedat" {
  project    = var.project_id
  database   = google_firestore_database.database.name
  collection = "transactions"

  fields {
    field_path = "uid"
    order      = "ASCENDING"
  }
  fields {
    field_path = "importId"
    order      = "ASCENDING"
  }
  fields {
    field_path = "postedAt"
    order      = "DESCENDING"
  }
}

# Categories: list by user + name (for lookups)
resource "google_firestore_index" "categories_uid_name" {
  project    = var.project_id
  database   = google_firestore_database.database.name
  collection = "categories"

  fields {
    field_path = "uid"
    order      = "ASCENDING"
  }
  fields {
    field_path = "name"
    order      = "ASCENDING"
  }
}

# Categories: list default categories by sort order
resource "google_firestore_index" "categories_isdefault_sortorder" {
  project    = var.project_id
  database   = google_firestore_database.database.name
  collection = "categories"

  fields {
    field_path = "isDefault"
    order      = "ASCENDING"
  }
  fields {
    field_path = "sortOrder"
    order      = "ASCENDING"
  }
}

# Categories: list user's visible categories by sort order
resource "google_firestore_index" "categories_uid_ishidden_sortorder" {
  project    = var.project_id
  database   = google_firestore_database.database.name
  collection = "categories"

  fields {
    field_path = "uid"
    order      = "ASCENDING"
  }
  fields {
    field_path = "isHidden"
    order      = "ASCENDING"
  }
  fields {
    field_path = "sortOrder"
    order      = "ASCENDING"
  }
}

# Rules: list enabled rules by user, sorted by priority
resource "google_firestore_index" "rules_uid_enabled_priority" {
  project    = var.project_id
  database   = google_firestore_database.database.name
  collection = "rules"

  fields {
    field_path = "uid"
    order      = "ASCENDING"
  }
  fields {
    field_path = "enabled"
    order      = "ASCENDING"
  }
  fields {
    field_path = "priority"
    order      = "DESCENDING"
  }
}

# Imports: list by user, sorted by creation date
resource "google_firestore_index" "imports_uid_createdat" {
  project    = var.project_id
  database   = google_firestore_database.database.name
  collection = "imports"

  fields {
    field_path = "uid"
    order      = "ASCENDING"
  }
  fields {
    field_path = "createdAt"
    order      = "DESCENDING"
  }
}

# Imports: list by user + status, sorted by creation date
resource "google_firestore_index" "imports_uid_status_createdat" {
  project    = var.project_id
  database   = google_firestore_database.database.name
  collection = "imports"

  fields {
    field_path = "uid"
    order      = "ASCENDING"
  }
  fields {
    field_path = "status"
    order      = "ASCENDING"
  }
  fields {
    field_path = "createdAt"
    order      = "DESCENDING"
  }
}

# Dismissed suggestions: lookup by user + merchant
resource "google_firestore_index" "dismissedsuggestions_uid_merchant" {
  project    = var.project_id
  database   = google_firestore_database.database.name
  collection = "dismissedSuggestions"

  fields {
    field_path = "uid"
    order      = "ASCENDING"
  }
  fields {
    field_path = "merchantNormalized"
    order      = "ASCENDING"
  }
}
