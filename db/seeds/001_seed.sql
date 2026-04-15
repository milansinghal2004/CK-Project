BEGIN;

INSERT INTO menu_items (id, name, description, price, rating, prep_minutes, category, image, is_veg, is_active)
VALUES
('dish-001','Royal Pot Biryani','Saffron rice, roasted vegetables, and signature masala in a copper pot.',329,4.8,26,'Main Course','/assets/feature-biryani.jpg',TRUE,TRUE),
('dish-002','Street Pani Puri','Crunchy puri with spiced potato and tangy mint water.',149,4.6,12,'Starters','/assets/pani-puri.png',TRUE,TRUE),
('dish-003','Classic Samosa Basket','Golden samosas with green chutney and onion salad.',129,4.5,10,'Starters','/assets/samosa.png',TRUE,TRUE),
('dish-004','Loaded Dahi Chaat','Crispy papdi topped with yogurt, chutneys, and pomegranate.',169,4.7,14,'Starters','/assets/dahi-chaat.jpg',TRUE,TRUE),
('dish-005','Spicy Veg Frankie','Soft roll with tossed vegetables and smoky house sauce.',179,4.4,15,'Wraps','/assets/frankie-roll.jpg',TRUE,TRUE),
('dish-006','Chili Paneer Bites','Pan-seared paneer cubes tossed in chili garlic glaze.',239,4.6,20,'Main Course','/assets/chili-paneer.png',TRUE,TRUE),
('dish-007','Farmhouse Pizza','Thin crust pizza with bell peppers, onion, and corn.',299,4.5,22,'Main Course','/assets/pizza.png',TRUE,TRUE),
('dish-008','Cheese Burger Stack','Soft bun, crunchy patty, lettuce, and melty cheese.',269,4.3,18,'Main Course','/assets/burger.png',TRUE,TRUE),
('dish-009','Smoky Hakka Noodles','Wok-tossed noodles with crunchy veggies and soy sesame.',249,4.4,19,'Main Course','/assets/noodles.png',TRUE,TRUE),
('dish-010','Blueberry Smoothie','Fresh blueberry blend with chilled milk and cream.',189,4.2,8,'Beverages','/assets/blueberry-smoothie.png',TRUE,TRUE),
('dish-011','Cafe Latte','Smooth espresso with frothed milk and cocoa finish.',159,4.3,7,'Beverages','/assets/coffee.png',TRUE,TRUE),
('dish-012','Masala Fries','Crispy fries tossed in peri-peri and chat masala.',139,4.1,9,'Starters','/assets/fries.png',TRUE,TRUE)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  rating = EXCLUDED.rating,
  prep_minutes = EXCLUDED.prep_minutes,
  category = EXCLUDED.category,
  image = EXCLUDED.image,
  is_veg = EXCLUDED.is_veg,
  is_active = EXCLUDED.is_active;

INSERT INTO offers (id, title, description, code, discount_percent, discount_flat, min_order_value, is_active)
VALUES
('offer-001','Weekend Feast','Flat 25% off on all Main Course dishes above Rs 499.','WEEKEND25',25,NULL,499,TRUE),
('offer-002','Starter Combo','Buy 2 starters and get 1 beverage free.','STARTSMART',15,NULL,299,TRUE),
('offer-003','First Order','New users get instant Rs 120 off.','FIRSTBITE',NULL,120,399,TRUE)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  code = EXCLUDED.code,
  discount_percent = EXCLUDED.discount_percent,
  discount_flat = EXCLUDED.discount_flat,
  min_order_value = EXCLUDED.min_order_value,
  is_active = EXCLUDED.is_active;

COMMIT;
