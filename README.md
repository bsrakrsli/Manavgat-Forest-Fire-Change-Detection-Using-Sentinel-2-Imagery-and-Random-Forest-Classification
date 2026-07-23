# Manavgat-Forest-Fire-Change-Detection-Using-Sentinel-2-Imagery-and-Random-Forest-Classification
# 🔥 Wildfire Impact Assessment Using Sentinel-2 and Random Forest Classification

Remote sensing project for detecting wildfire damage using Sentinel-2 satellite imagery, spectral indices, and a Random Forest classifier in Google Earth Engine (GEE).

---

## 📌 Project Overview

This project analyzes the 2021 Manavgat (Antalya, Türkiye) wildfire using Sentinel-2 imagery and machine learning techniques.

The workflow integrates spectral indices (NBR, dNBR, NDVI, dNDVI, NDWI) with a Random Forest classifier to identify burned areas and evaluate wildfire severity.

---

## 🎯 Objectives

- Detect burned areas using Sentinel-2 imagery
- Calculate wildfire extent
- Generate burn severity maps (dNBR)
- Perform land cover classification
- Evaluate classification accuracy using confusion matrix
- Support environmental monitoring through remote sensing

---

## 📍 Study Area

**Location:** Manavgat, Antalya, Türkiye

Approximate study area:

- 20 × 20 km
- Coordinates:
  - Latitude: **36.930° N**
  - Longitude: **31.330° E**

---

## 🛰️ Data

| Dataset | Purpose |
|----------|----------|
| Sentinel-2 SR Harmonized | Multispectral imagery |
| Pre-fire Composite | Before wildfire |
| Post-fire Composite | After wildfire |
| Spectral Indices | NBR, dNBR, NDVI, dNDVI, NDWI |

---

## ⚙️ Methodology

The workflow consists of:

1. Import Sentinel-2 imagery
2. Cloud masking
3. Generate pre/post-fire composites
4. Calculate spectral indices
5. Prepare training samples
6. Train Random Forest classifier
7. Produce land cover map
8. Accuracy assessment
9. Burned area calculation

---

## 🌱 Spectral Indices

- NBR
- dNBR
- NDVI
- dNDVI
- NDWI

---

## 🤖 Machine Learning

Algorithm:

- Random Forest

Parameters:

- 150 Trees

Classes:

- Unburned Vegetation
- Burned Area
- Bare Soil / Agriculture / Rocky Surface
- Water Body

---

## 📊 Results

- Overall Accuracy: **88.7%**
- Automatic Validation Accuracy: **97.6%**
- Burned Area: **17,949 ha**

The classifier successfully distinguished burned forests from unburned vegetation and other land cover classes.

---

## 🛠️ Technologies Used

- Google Earth Engine
- JavaScript
- Sentinel-2
- Random Forest
- Remote Sensing
- GIS

---

## 📄 Project Report

Full report:

📄 **Wildfire Impact Assessment Using dNBR and Random Forest Classification**

[gmt346 _TermProject_busra_kirisli_2200674056.pdf](https://github.com/user-attachments/files/30287906/gmt346._TermProject_busra_kirisli_2200674056.pdf)


---

## 💻 Google Earth Engine Code

The complete Google Earth Engine script can be accessed below:

👉 **GEE Script**

https://code.earthengine.google.com/16deaa4b8b395d40db9834349<d20b6

---

## 📚 References

- ESA Sentinel-2 User Handbook
- Google Earth Engine Documentation
- Breiman (2001) Random Forests
- Chuvieco (2016)
- Copernicus Open Access Hub

---

## 👩‍💻 Author

**Büşra Kirişli**

Geomatics Engineer

Hacettepe University
