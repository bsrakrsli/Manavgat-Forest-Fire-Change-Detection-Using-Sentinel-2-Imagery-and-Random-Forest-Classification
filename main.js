// ===============================
// Supervised Random Forest Fire Classification
// Sentinel-2 + NBR + NDVI + dNBR
// Classes:
// 0 = Unburned vegetation
// 1 = Burned area
// 2 = Bare soil / agriculture / rock
// 3 = Water body
// ===============================

// ===============================
// 1) STUDY AREA
// ===============================

var center = ee.Geometry.Point([31.330, 36.930]);
var aoi = center.buffer(10000).bounds();

Map.centerObject(aoi, 11);
Map.addLayer(aoi, {color: 'red'}, '20 km x 20 km AOI');

// ===============================
// 2) DATE RANGES
// ===============================

var preStart = '2021-06-01';
var preEnd   = '2021-07-20';

var postStart = '2021-08-05';
var postEnd   = '2021-09-30';

// ===============================
// 3) CLOUD MASK
// ===============================

function maskS2sr(image) {
  var scl = image.select('SCL');

  var mask = scl.neq(3)
    .and(scl.neq(8))
    .and(scl.neq(9))
    .and(scl.neq(10))
    .and(scl.neq(11));

  return image.updateMask(mask)
    .divide(10000)
    .copyProperties(image, ['system:time_start']);
}

// ===============================
// 4) SENTINEL-2 COMPOSITE
// ===============================

function getS2Composite(start, end) {
  return ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
    .filterBounds(aoi)
    .filterDate(start, end)
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 30))
    .map(maskS2sr)
    .median()
    .clip(aoi);
}

var preImage = getS2Composite(preStart, preEnd);
var postImage = getS2Composite(postStart, postEnd);

// ===============================
// 5) VISUALIZATION
// ===============================

var trueColor = {
  bands: ['B4', 'B3', 'B2'],
  min: 0,
  max: 0.3
};

var falseColor = {
  bands: ['B12', 'B8', 'B4'],
  min: 0,
  max: 0.4
};

Map.addLayer(preImage, trueColor, 'Pre-fire True Color');
Map.addLayer(postImage, trueColor, 'Post-fire True Color');
Map.addLayer(postImage, falseColor, 'Post-fire False Color');

// ===============================
// 6) INDICES
// ===============================

var preNBR = preImage.normalizedDifference(['B8', 'B12']).rename('pre_NBR');
var postNBR = postImage.normalizedDifference(['B8', 'B12']).rename('post_NBR');
var dNBR = preNBR.subtract(postNBR).rename('dNBR');

var preNDVI = preImage.normalizedDifference(['B8', 'B4']).rename('pre_NDVI');
var postNDVI = postImage.normalizedDifference(['B8', 'B4']).rename('post_NDVI');
var dNDVI = preNDVI.subtract(postNDVI).rename('dNDVI');

var postNDWI = postImage.normalizedDifference(['B3', 'B8']).rename('post_NDWI');

Map.addLayer(dNBR, {
  min: -0.2,
  max: 0.8,
  palette: ['blue', 'white', 'yellow', 'orange', 'red', 'black']
}, 'dNBR');

// ===============================
// 7) FEATURE STACK FOR RANDOM FOREST
// ===============================

var featureStack = postImage.select([
  'B2', 'B3', 'B4', 'B8', 'B11', 'B12'
])
.addBands(preNBR)
.addBands(postNBR)
.addBands(dNBR)
.addBands(preNDVI)
.addBands(postNDVI)
.addBands(dNDVI)
.addBands(postNDWI)
.clip(aoi);

var inputBands = [
  'B2', 'B3', 'B4', 'B8', 'B11', 'B12',
  'pre_NBR', 'post_NBR', 'dNBR',
  'pre_NDVI', 'post_NDVI', 'dNDVI',
  'post_NDWI'
];

// ===============================
// 8) TRAINING DATA
// Draw these polygons manually in GEE:
// burnedTraining
// unburnedTraining
// bareSoilTraining
// waterTraining
// ===============================

var burnedSamples = ee.FeatureCollection(burnedTraining).map(function(f) {
  return f.set('class', 1);
});

var unburnedSamples = ee.FeatureCollection(unburnedTraining).map(function(f) {
  return f.set('class', 0);
});

var bareSoilSamples = ee.FeatureCollection(bareSoilTraining).map(function(f) {
  return f.set('class', 2);
});

var waterSamples = ee.FeatureCollection(waterTraining).map(function(f) {
  return f.set('class', 3);
});

var trainingPolygons = burnedSamples
  .merge(unburnedSamples)
  .merge(bareSoilSamples)
  .merge(waterSamples);

Map.addLayer(trainingPolygons, {}, 'Training Polygons');

// ===============================
// 9) SAMPLE TRAINING PIXELS
// ===============================

var classImage = ee.Image().byte().paint({
  featureCollection: trainingPolygons,
  color: 'class'
}).rename('class');

var trainingImage = featureStack.addBands(classImage);

var trainingData = trainingImage.stratifiedSample({
  numPoints: 1200,
  classBand: 'class',
  region: aoi,
  scale: 20,
  classValues: [0, 1, 2, 3],
  classPoints: [300, 300, 300, 300],
  geometries: true,
  seed: 42,
  tileScale: 4
});

print('Training data:', trainingData);

// ===============================
// 10) RANDOM FOREST CLASSIFIER
// ===============================

var classifier = ee.Classifier.smileRandomForest({
  numberOfTrees: 150,
  seed: 42
}).train({
  features: trainingData,
  classProperty: 'class',
  inputProperties: inputBands
});

// ===============================
// 11) CLASSIFICATION
// ===============================

var classified = featureStack.classify(classifier).rename('classification');

Map.addLayer(classified, {
  min: 0,
  max: 3,
  palette: ['green', 'red', 'yellow', 'blue']
}, 'Random Forest Classification');

// Burned only
var burnedRF = classified.eq(1).rename('burned_RF');

Map.addLayer(burnedRF.updateMask(burnedRF), {
  palette: ['red']
}, 'Burned Area - Random Forest');

// ===============================
// 12) BURNED AREA CALCULATION
// ===============================

var burnedAreaImage = ee.Image.pixelArea()
  .divide(10000)
  .updateMask(burnedRF);

var burnedArea = burnedAreaImage.reduceRegion({
  reducer: ee.Reducer.sum(),
  geometry: aoi,
  scale: 10,
  maxPixels: 1e13
});

print('Random Forest Burned Area hectares:', burnedArea);

// ===============================
// 13) VALIDATION POINTS
// Independent validation points
// ===============================

var validationPoints = classified.stratifiedSample({
  numPoints: 200,
  classBand: 'classification',
  region: aoi,
  scale: 10,
  classValues: [0, 1, 2, 3],
  classPoints: [50, 50, 50, 50],
  geometries: true,
  seed: 99
});

var validationPointsWithCoords = validationPoints.map(function(feature) {
  var coords = feature.geometry().coordinates();

  return feature.set({
    'longitude': coords.get(0),
    'latitude': coords.get(1),
    'reference': ''
  });
});

Map.addLayer(validationPointsWithCoords, {color: 'cyan'}, 'Validation Points');

print('Validation points with coordinates:', validationPointsWithCoords);

Export.table.toDrive({
  collection: validationPointsWithCoords,
  description: 'RF_Validation_Points_200_with_Coordinates',
  fileFormat: 'CSV'
});

// ===============================
// 14) AUTOMATIC HIGH-CONFIDENCE VALIDATION
// Optional support accuracy
// Binary burned / unburned support check
// ===============================

var highConfBurned = dNBR.gt(0.44).rename('reference');
var highConfUnburned = dNBR.lt(0.10).and(postNDWI.lt(0.1)).rename('reference');

var burnedVal = highConfBurned.selfMask().sample({
  region: aoi,
  scale: 10,
  numPixels: 50,
  seed: 11,
  geometries: true
}).map(function(f) {
  var coords = f.geometry().coordinates();
  return f.set({
    'reference': 1,
    'longitude': coords.get(0),
    'latitude': coords.get(1)
  });
});

var unburnedVal = highConfUnburned.selfMask().sample({
  region: aoi,
  scale: 10,
  numPixels: 50,
  seed: 22,
  geometries: true
}).map(function(f) {
  var coords = f.geometry().coordinates();
  return f.set({
    'reference': 0,
    'longitude': coords.get(0),
    'latitude': coords.get(1)
  });
});

var autoValidation = burnedVal.merge(unburnedVal);

var autoValidationClassified = classified.sampleRegions({
  collection: autoValidation,
  properties: ['reference', 'longitude', 'latitude'],
  scale: 10,
  geometries: true
});

var binaryAutoValidation = autoValidationClassified.map(function(f) {
  var cls = ee.Number(f.get('classification'));
  var binaryClass = cls.eq(1);
  return f.set('classified_binary', binaryClass);
});

var confusionMatrix = binaryAutoValidation.errorMatrix(
  'reference',
  'classified_binary'
);

print('Automatic Validation Confusion Matrix:', confusionMatrix);
print('Automatic Overall Accuracy:', confusionMatrix.accuracy());
print('Automatic Kappa:', confusionMatrix.kappa());
print('Automatic Producer Accuracy:', confusionMatrix.producersAccuracy());
print('Automatic User Accuracy:', confusionMatrix.consumersAccuracy());

Export.table.toDrive({
  collection: binaryAutoValidation,
  description: 'RF_Automatic_Validation_100',
  fileFormat: 'CSV'
});

// ===============================
// 15) EXPORT IMAGES
// ===============================

Export.image.toDrive({
  image: classified,
  description: 'RF_Classification_Manavgat_4Classes',
  folder: 'GEE_Fire_Project',
  fileNamePrefix: 'RF_Classification_Manavgat_4Classes',
  region: aoi,
  scale: 10,
  maxPixels: 1e13
});

Export.image.toDrive({
  image: burnedRF,
  description: 'RF_Burned_Area_Manavgat',
  folder: 'GEE_Fire_Project',
  fileNamePrefix: 'RF_Burned_Area_Manavgat',
  region: aoi,
  scale: 10,
  maxPixels: 1e13
});

Export.image.toDrive({
  image: dNBR,
  description: 'dNBR_Manavgat',
  folder: 'GEE_Fire_Project',
  fileNamePrefix: 'dNBR_Manavgat',
  region: aoi,
  scale: 10,
  maxPixels: 1e13
});

// ===============================
// 16) CLICK COORDINATE TOOL
// ===============================

Map.onClick(function(coords) {
  print('Clicked longitude:', coords.lon);
  print('Clicked latitude:', coords.lat);

  var point = ee.Geometry.Point([coords.lon, coords.lat]);

  var classValue = classified.sample({
    region: point,
    scale: 10,
    geometries: true
  });

  print('Class at clicked point:', classValue);
});
