SCHEMA = """
Tables:

users:
- id (INT, primary key)
- name (VARCHAR)
- email (VARCHAR)
- created_at (DATE)

products:
- id (INT, primary key)
- name (VARCHAR)
- price (DECIMAL)

orders:
- id (INT, primary key)
- user_id (INT, foreign key -> users.id)
- product_id (INT, foreign key -> products.id)
- amount (DECIMAL)
- order_date (DATE)

Relationships:
- orders.user_id → users.id
- orders.product_id → products.id
"""