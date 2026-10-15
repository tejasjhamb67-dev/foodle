/**
 * Approximate geographic centroids for Indian states and regions (degrees).
 * Closes open item 14 ("State coordinates") in the design system. Pan-India has none.
 */
export const STATE_COORDS: Record<string, [number, number]> = {
  "Andhra Pradesh": [15.9, 79.7],
  "Arunachal Pradesh": [28.2, 94.7],
  Assam: [26.2, 92.9],
  Bihar: [25.1, 85.3],
  Chhattisgarh: [21.3, 81.9],
  Delhi: [28.6, 77.2],
  Goa: [15.3, 74.1],
  Gujarat: [22.3, 71.2],
  "Himachal Pradesh": [31.9, 77.2],
  "Jammu & Kashmir": [33.8, 75.1],
  Karnataka: [15.3, 75.7],
  Kerala: [10.5, 76.3],
  "Madhya Pradesh": [23.5, 78.7],
  Maharashtra: [19.6, 75.6],
  Manipur: [24.7, 93.9],
  Meghalaya: [25.5, 91.4],
  Mizoram: [23.2, 92.9],
  Nagaland: [26.2, 94.6],
  Odisha: [20.5, 84.4],
  Punjab: [31.0, 75.4],
  Rajasthan: [27.0, 74.2],
  Sikkim: [27.5, 88.5],
  "Tamil Nadu": [11.1, 78.7],
  Telangana: [17.9, 79.0],
  Tripura: [23.8, 91.7],
  "Uttar Pradesh": [26.8, 80.9],
  Uttarakhand: [30.1, 79.0],
  "West Bengal": [22.9, 87.9],
};
