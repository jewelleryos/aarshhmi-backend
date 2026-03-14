-- Table: states
-- Purpose: Indian states and union territories lookup table

CREATE TABLE IF NOT EXISTS states (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name TEXT NOT NULL,
    iso2 TEXT NOT NULL,
    type TEXT NOT NULL,                    -- 'state' | 'union territory'
    latitude DECIMAL(11,8),
    longitude DECIMAL(11,8),
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- Seed: 36 states and union territories
INSERT INTO states (name, iso2, type, latitude, longitude) VALUES
    ('Andaman and Nicobar Islands', 'AN', 'union territory', 11.74008670, 92.65864010),
    ('Andhra Pradesh', 'AP', 'state', 15.91289980, 79.73998750),
    ('Arunachal Pradesh', 'AR', 'state', 28.21799940, 94.72775280),
    ('Assam', 'AS', 'state', 26.20060430, 92.93757390),
    ('Bihar', 'BR', 'state', 25.09607420, 85.31311940),
    ('Chandigarh', 'CH', 'union territory', 30.73331480, 76.77941790),
    ('Chhattisgarh', 'CT', 'state', 21.27865670, 81.86614420),
    ('Dadra and Nagar Haveli and Daman and Diu', 'DH', 'union territory', 20.39737360, 72.83279910),
    ('Delhi', 'DL', 'union territory', 28.70405920, 77.10249020),
    ('Goa', 'GA', 'state', 15.29932650, 74.12399600),
    ('Gujarat', 'GJ', 'state', 22.25865200, 71.19238050),
    ('Haryana', 'HR', 'state', 29.05877570, 76.08560100),
    ('Himachal Pradesh', 'HP', 'state', 31.10482940, 77.17339010),
    ('Jammu and Kashmir', 'JK', 'union territory', 33.27783900, 75.34121790),
    ('Jharkhand', 'JH', 'state', 23.61018080, 85.27993540),
    ('Karnataka', 'KA', 'state', 15.31727750, 75.71388840),
    ('Kerala', 'KL', 'state', 10.85051590, 76.27108330),
    ('Ladakh', 'LA', 'union territory', 34.22684750, 77.56194190),
    ('Lakshadweep', 'LD', 'union territory', 10.32802650, 72.78463360),
    ('Madhya Pradesh', 'MP', 'state', 22.97342290, 78.65689420),
    ('Maharashtra', 'MH', 'state', 19.75147980, 75.71388840),
    ('Manipur', 'MN', 'state', 24.66371730, 93.90626880),
    ('Meghalaya', 'ML', 'state', 25.46703080, 91.36621600),
    ('Mizoram', 'MZ', 'state', 23.16454300, 92.93757390),
    ('Nagaland', 'NL', 'state', 26.15843540, 94.56244260),
    ('Odisha', 'OR', 'state', 20.95166580, 85.09852360),
    ('Puducherry', 'PY', 'union territory', 11.94159150, 79.80831330),
    ('Punjab', 'PB', 'state', 31.14713050, 75.34121790),
    ('Rajasthan', 'RJ', 'state', 27.02380360, 74.21793260),
    ('Sikkim', 'SK', 'state', 27.53297180, 88.51221780),
    ('Tamil Nadu', 'TN', 'state', 11.12712250, 78.65689420),
    ('Telangana', 'TG', 'state', 18.11243720, 79.01929970),
    ('Tripura', 'TR', 'state', 23.94084820, 91.98815270),
    ('Uttar Pradesh', 'UP', 'state', 26.84670880, 80.94615920),
    ('Uttarakhand', 'UK', 'state', 30.06675300, 79.01929970),
    ('West Bengal', 'WB', 'state', 22.98675690, 87.85497550);
