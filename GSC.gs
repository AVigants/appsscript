/**
 * Fetch GSC metrics for a given URL and date range.
 * @param {string} property - The GSC property (e.g., "sc-domain:example.com").
 * @param {string} dimension - The GSC dimension ("page", "query", etc.)
 * @param {string} startDate - Start date for the data (YYYY-MM-DD).
 * @param {string} endDate - End date for the data (YYYY-MM-DD).
 * @param {string} matchOperator - The match operator ("contains", "!contains", "equals", "regex").
 * @param {string} expression - The search expression or text pattern.
 * @return {object|string} - Returns GSC metrics or a string if an error occurs.
 */
function GSC(
  property,
  dimension,
  startDate,
  endDate,
  matchOperator,
  expression,
) {
  startDate = normalizeDate(startDate) || getLastThreeMonths().startDate;
  endDate = normalizeDate(endDate) || getLastThreeMonths().endDate;

  try {
    var service = GET_SERVICE();
    if (!service.hasAccess()) {
      Logger.log('Authorization required. Run "authorize" first.');
      return 'Authorization required. Run "authorize" first.';
    }
    var encodedPropertyURI = encodeURIComponent(property);

    var apiUrl =
      "https://www.googleapis.com/webmasters/v3/sites/" +
      encodedPropertyURI +
      "/searchAnalytics/query";
    var payload = {
      startDate: startDate,
      endDate: endDate,
      dimensions: ["date"],
      dimensionFilterGroups: [
        {
          filters: [
            {
              dimension: dimension,
              operator: matchOperator,
              expression: expression,
            },
          ],
        },
      ],
      rowLimit: 1000, // Adjust as needed
    };

    var options = {
      method: "post",
      headers: {
        Authorization: "Bearer " + service.getAccessToken(),
        "Content-Type": "application/json",
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    };

    var response = UrlFetchApp.fetch(apiUrl, options);
    if (response.getResponseCode() === 200) {
      var gscData = JSON.parse(response.getContentText());
      var result = processGSCResponse(gscData);
      return result;
    } else {
      Logger.log("Error: " + response.getContentText());
      return "Error: " + response.getContentText();
    }
  } catch (e) {
    Logger.log("Exception: " + e.message);
    return "Exception: " + e.message;
  }
}

/**
 * Process GSC response data and aggregate metrics.
 * @param {Object} gscData - The GSC response data.
 * @return {Object} - Aggregated metrics and time-series data.
 */
function processGSCResponse(gscData) {
  var clicksSum = 0;
  var impressionsSum = 0;
  var weightedCtrSum = 0;
  var weightedPositionSum = 0;

  var clicksArray = [];
  var impressionsArray = [];
  var ctrArray = [];
  var positionArray = [];

  if (gscData.rows && gscData.rows.length) {
    for (var i = 0; i < gscData.rows.length; i++) {
      var row = gscData.rows[i];
      var clicks = row.clicks || 0;
      var impressions = row.impressions || 0;
      var ctr = row.ctr || 0;
      var position = row.position || 0;

      // Add to sum for weighted averages
      clicksSum += clicks;
      impressionsSum += impressions;

      if (impressions > 0) {
        weightedCtrSum += ctr * impressions; // Weight by impressions
        weightedPositionSum += position * impressions; // Weight by impressions
      }

      // Add to time-series arrays
      clicksArray.push(clicks);
      impressionsArray.push(impressions);
      ctrArray.push((ctr * 100).toFixed(2)); // Convert to percentage
      positionArray.push(position.toFixed(2));
    }
  }

  // Calculate weighted averages
  var weightedCtr =
    impressionsSum > 0
      ? ((weightedCtrSum / impressionsSum) * 100).toFixed(2)
      : 0;
  var weightedPosition =
    impressionsSum > 0 ? (weightedPositionSum / impressionsSum).toFixed(2) : 0;

  return [
    [
      // Time-series data as string
      clicksArray.join(";"), // 1. Clicks over time
      impressionsArray.join(";"), // 2. Impressions over time
      ctrArray.join(";"), // 3. CTR over time
      positionArray.join(";"), // 4. Position over time

      // Aggregated metrics
      clicksSum, // 5. Total clicks
      impressionsSum, // 6. Total impressions
      weightedCtr, // 7. Weighted average CTR
      weightedPosition, // 8. Weighted average position
    ],
  ];
}

/**
 * Helper function to get last 3 months as a date range.
 */
function getLastThreeMonths() {
  var today = new Date();
  var endDate = new Date(today);
  var startDate = new Date(today);
  startDate.setMonth(startDate.getMonth() - 3);

  return {
    startDate: startDate.toISOString().split("T")[0],
    endDate: endDate.toISOString().split("T")[0],
  };
}

/**
 * Helper function to validate and convert dates to YYYY-MM-DD format.
 * @param {Date|string} dateInput - The input date.
 * @return {string|null} - Returns formatted date or null if invalid.
 */
function normalizeDate(dateInput) {
  if (!dateInput) return null;

  // If input is already a valid YYYY-MM-DD string
  if (typeof dateInput === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    return dateInput;
  }

  // Handle Date objects
  if (
    Object.prototype.toString.call(dateInput) === "[object Date]" &&
    !isNaN(dateInput.getTime())
  ) {
    var day = ("0" + dateInput.getDate()).slice(-2); // Zero-padded day
    var month = ("0" + (dateInput.getMonth() + 1)).slice(-2); // Zero-padded month
    var year = dateInput.getFullYear();

    return year + "-" + month + "-" + day; // Return formatted date
  }

  // Try to handle MM/DD/YYYY format as a fallback
  if (
    typeof dateInput === "string" &&
    /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateInput)
  ) {
    var parsedDate = new Date(dateInput);
    if (!isNaN(parsedDate.getTime())) {
      var day = ("0" + parsedDate.getDate()).slice(-2);
      var month = ("0" + (parsedDate.getMonth() + 1)).slice(-2);
      var year = parsedDate.getFullYear();
      return year + "-" + month + "-" + day;
    }
  }

  Logger.log("Invalid date format: " + dateInput);
  return null;
}

function listGSCProperties() {
  var service = GET_SERVICE();
  if (!service.hasAccess()) {
    Logger.log('Authorization required. Run "authorize" function.');
    return 'Authorization required. Run "authorize" function.';
  }

  var url = "https://www.googleapis.com/webmasters/v3/sites";
  var options = {
    method: "get",
    headers: {
      Authorization: "Bearer " + service.getAccessToken(),
    },
    muteHttpExceptions: true,
  };

  var response = UrlFetchApp.fetch(url, options);
  if (response.getResponseCode() !== 200) {
    Logger.log("Error: " + response.getContentText());
    return "Error: " + response.getContentText();
  }

  var result = JSON.parse(response.getContentText());

  if (result.siteEntry && result.siteEntry.length > 0) {
    Logger.log("✅ Properties you have access to:");
    result.siteEntry.forEach(function (site) {
      Logger.log(site.siteUrl);
    });
  } else {
    Logger.log("❌ No properties found.");
  }
}
