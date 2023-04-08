
var currentGeoJSONLayer = null;
var negeri = null;
var daerah = null;
var mukim = null;

// Initialize the map
var map = L.map('map').setView([0, 0], 2);
// Add a tile layer to the map (OpenStreetMap)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

window.addEventListener('load', function() {
    loadTempat("all_states");
});

fetchSenaraiTempat("/api/daerah/senarai-negeri").then(negeris => {
    clearDropdownTempat('subdistrict-select', 'NA', 'All sub-district(s)');
    clearDropdownTempat('district-select', 'NA', 'All district(s)');
    clearDropdownTempat('state-select', 'all_states', 'Malaysia');
    populateDropdownTempat('state-select', negeris);
});

document.getElementById('state-select').addEventListener('change', function () {
    negeri = this.value;
    if (negeri) {
      // Load the selected region on the map
      loadTempat(negeri);
      fetchSenaraiTempat("/api/mukim/senarai-daerah-" + negeri).then(daerahs => {
        clearDropdownTempat('subdistrict-select', 'NA', 'All sub-district(s)');
        clearDropdownTempat('district-select', 'NA', 'All district(s)');
        populateDropdownTempat('district-select', daerahs);
      });
    }
});

document.getElementById('district-select').addEventListener('change', function() {
    daerah = this.value;
    if (daerah && daerah=='NA') {
        loadTempat(negeri);
        clearDropdownTempat('subdistrict-select', 'NA', 'All sub-district(s)');
    } else if (negeri && daerah && daerah!='NA') {
        loadTempat(negeri, daerah);
        fetchSenaraiTempat("/api/mukim/senarai-mukim-" + negeri + "-" + daerah).then(mukims => {
            clearDropdownTempat('subdistrict-select', 'NA', 'All sub-district(s)');
            populateDropdownTempat('subdistrict-select', mukims, "NA", "All sub-district(s)");
        });
    }
})  

document.getElementById('subdistrict-select').addEventListener('change', function() {
    mukim = this.value;
    if (mukim && mukim=='NA') {
        loadTempat(negeri, daerah);
    } else if (negeri && daerah && mukim && daerah!='NA' && mukim!='NA') {
        loadTempat(negeri, daerah, mukim);
    }
})  

async function fetchSenaraiTempat(end_point) {
    try {
      const response = await fetch('http://127.0.0.1:5000'+end_point); 
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const data = await response.json();
      return data.result;
    } catch (error) {
      console.error('Error fetching senarai negeri:', error);
    }
}

function clearDropdownTempat(element_id, defaultValue="", defaultText="") {
    const selectElement = document.getElementById(element_id);

    // Clear the dropdown by setting its innerHTML to an empty string
    selectElement.innerHTML = '';
    
    // Add a default option to the dropdown
    const defaultOption = document.createElement('option');
    defaultOption.value = defaultValue;
    defaultOption.text = defaultText;
    selectElement.add(defaultOption);
}

function populateDropdownTempat(element_id, tempats) {
    const selectElement = document.getElementById(element_id);

    tempats.forEach(tempat => {
        const option = document.createElement('option');
        option.value = tempat; // Replace with the appropriate property from your API
        option.text = tempat; // Replace with the appropriate property from your API
        selectElement.add(option);
    });
}
  

// Load GeoJSON function
async function loadGeoJSON(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const geojsonData = await response.json();
    return geojsonData;
  } catch (error) {
    console.error('Error fetching GeoJSON:', error);
  }
}

function loadTempat(negeri, daerah=null, mukim=null) {
    showLoadingOverlay();

    if(negeri=="all_states"){
        var url = "http://127.0.0.1:5000/api/negeri/";
    } else if(daerah==null){
        var url = "http://127.0.0.1:5000/api/daerah-" + negeri.replace(' ', '%20');
    } else if(mukim==null){
        var url = "http://127.0.0.1:5000/api/mukim-" + negeri.replace(' ', '%20') + "-" + daerah.replace(' ', '%20');
    } else{
        var url = "http://127.0.0.1:5000/api/" + mukim.replace(' ', '%20') + "-" + negeri.replace(' ', '%20') + "-" + daerah.replace(' ', '%20');
    }

    loadGeoJSON(url).then(geojsonData => {
        console.log(geojsonData); // Log the GeoJSON data
        if (!geojsonData || !geojsonData.features || geojsonData.features.length === 0) {
            // Handle empty GeoJSON data here
            console.log('Empty GeoJSON data');
            hideLoadingOverlay();
            return;
        }

        if (currentGeoJSONLayer) {
            map.removeLayer(currentGeoJSONLayer);
        }

        var geojsonLayer = L.geoJSON(geojsonData, {
        onEachFeature: function (feature, layer) {
            var popupContent = "";
            for (var key in feature.properties) {
                if (feature.properties.hasOwnProperty(key)) {
                  popupContent += '<strong>' + key + ':</strong> ' + feature.properties[key] + '<br>';
                }
            }
            var popupOptions = { closeButton: false };
            layer.bindPopup(popupContent, popupOptions);

            layer.on({
            click: function (e) {
                map.fitBounds(layer.getBounds());
            },
            mouseover: function (e) {
                timer = setTimeout(function() {
                layer.openPopup();
                layer.setStyle({
                    color: 'red'
                });
                }, 500);
            },
            mouseout: function (e) {
                clearTimeout(timer);
                this.closePopup();
                geojsonLayer.resetStyle(layer);
            }
            });
        }
        }).addTo(map);
        // Zoom to the extent of the available polygon
        // map.fitBounds(geojsonLayer.getBounds());
        map.flyToBounds(geojsonLayer.getBounds(), { duration: 1.5 });


        currentGeoJSONLayer = geojsonLayer;
        hideLoadingOverlay();
  });
}

function showLoadingOverlay() {
    document.getElementById('loading-overlay').style.display = 'flex';
}

function hideLoadingOverlay() {
    document.getElementById('loading-overlay').style.display = 'none';
}
  