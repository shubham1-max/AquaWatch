class RunoffService {
  /**
   * Calculate potential runoff volume
   * @param {number} rainfall - Rainfall in mm
   * @param {number} catchmentArea - Area in square meters
   * @param {number} runoffCoefficient - Coefficient (0-1)
   * @returns {Object} Runoff calculation with volume in liters and cubic meters
   */
  calculateRunoff(rainfall, catchmentArea, runoffCoefficient) {
    // Validate inputs
    if (rainfall < 0 || catchmentArea < 0 || runoffCoefficient < 0 || runoffCoefficient > 1) {
      throw new Error('Invalid input parameters');
    }

    // Formula: Runoff (L) = rainfall (mm) × area (m²) × runoff coefficient
    const runoffLiters = rainfall * catchmentArea * runoffCoefficient;
    const runoffCubicMeters = runoffLiters / 1000;

    return {
      runoffLiters: Math.round(runoffLiters),
      runoffCubicMeters: Math.round(runoffCubicMeters * 100) / 100,
      inputs: {
        rainfall,
        catchmentArea,
        runoffCoefficient
      }
    };
  }

  /**
   * Get recommended runoff coefficient based on surface type
   * @param {string} surfaceType
   * @returns {number} Runoff coefficient
   */
  getRunoffCoefficient(surfaceType) {
    const coefficients = {
      'concrete': 0.90,
      'asphalt': 0.85,
      'roof': 0.90,
      'compacted_soil': 0.60,
      'gravel': 0.50,
      'lawn_flat': 0.20,
      'lawn_steep': 0.35,
      'forest': 0.10,
      'mixed_urban': 0.70
    };

    return coefficients[surfaceType] || 0.70; // Default to mixed urban
  }

  /**
   * Generate intervention recommendations based on runoff volume
   * @param {number} runoffCubicMeters - Runoff volume in cubic meters
   * @param {string} issueType - Type of water issue
   * @returns {Object} Recommendation with intervention details
   */
  generateRecommendation(runoffCubicMeters, issueType) {
    let interventionType = '';
    let description = '';
    let requirements = [];
    let assumptions = [];
    let limitations = [];

    if (runoffCubicMeters < 5) {
      interventionType = 'Rain Garden or Bioswale';
      description = 'Small-scale green infrastructure to absorb and filter runoff naturally.';
      requirements = [
        'Available land area: 10-15 m²',
        'Soil permeability test',
        'Native plant selection',
        'Minimal slope (< 5%)'
      ];
    } else if (runoffCubicMeters < 20) {
      interventionType = 'Recharge Pit or Soakaway';
      description = 'Underground structure to capture and infiltrate runoff into the groundwater.';
      requirements = [
        'Available space: 3-5 m²',
        'Groundwater level check (minimum 3m depth)',
        'Soil percolation test',
        'Pre-filtration system',
        'No contamination sources nearby'
      ];
    } else if (runoffCubicMeters < 50) {
      interventionType = 'Rainwater Harvesting System';
      description = 'Collection and storage system for reuse in non-potable applications.';
      requirements = [
        `Storage tank capacity: ${Math.ceil(runoffCubicMeters)}m³`,
        'First-flush diverter',
        'Filtration system',
        'Distribution pump',
        'Regular maintenance schedule'
      ];
    } else {
      interventionType = 'Community-Scale Detention Basin';
      description = 'Large temporary storage to regulate stormwater flow and prevent flooding.';
      requirements = [
        `Basin capacity: ${Math.ceil(runoffCubicMeters * 1.2)}m³`,
        'Land acquisition or easement',
        'Controlled outlet structure',
        'Regular desilting',
        'Civil engineering design'
      ];
    }

    // Common assumptions
    assumptions = [
      'Rainfall estimate is based on weather forecast, not measured data',
      'Catchment area is estimated and may need field verification',
      'Runoff coefficient assumes typical urban surface conditions',
      'Does not account for existing drainage infrastructure',
      'Soil conditions assumed suitable without field testing'
    ];

    // Common limitations
    limitations = [
      '⚠️ This is a scenario estimate, not an engineering design',
      '⚠️ Field assessment required for soil type, groundwater level, and contamination',
      '⚠️ May require permits and compliance with local regulations',
      '⚠️ Professional engineering review mandatory before implementation',
      '⚠️ Water quality testing needed if intended for any reuse',
      '⚠️ Site-specific factors (utilities, property lines) not considered'
    ];

    return {
      interventionType,
      description,
      estimatedCapture: {
        cubicMeters: runoffCubicMeters,
        liters: runoffCubicMeters * 1000
      },
      requirements,
      assumptions,
      limitations,
      nextSteps: [
        '1. Conduct site visit to verify conditions',
        '2. Perform soil percolation test',
        '3. Check groundwater levels and utilities',
        '4. Consult with civil/environmental engineer',
        '5. Verify local regulations and permits required'
      ],
      confidence: 'Low - Requires field verification'
    };
  }

  /**
   * Calculate potential water savings per year
   * @param {number} runoffCubicMeters - Single event runoff
   * @param {number} rainyDaysPerYear - Expected rainy days
   * @returns {Object} Annual savings estimate
   */
  calculateAnnualSavings(runoffCubicMeters, rainyDaysPerYear = 60) {
    const annualCubicMeters = runoffCubicMeters * rainyDaysPerYear;
    const annualLiters = annualCubicMeters * 1000;

    return {
      annualCubicMeters: Math.round(annualCubicMeters),
      annualLiters: Math.round(annualLiters),
      equivalentHouseholds: Math.round(annualCubicMeters / 150), // 150m³/year per household
      note: 'Estimate based on average rainfall patterns. Actual capture depends on storage capacity and usage rate.'
    };
  }
}

export default new RunoffService();
