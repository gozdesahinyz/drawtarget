/*
 * DrawTarget's calculation engine, ported a third time - after
 * pension_drawdown_engine.py (reference) and PensionEngine.swift (iOS
 * app) - into plain JavaScript for the website's free-tier calculator.
 * Same constants, same formulas, same logic. Single-pot only (the
 * free tier's scope); multi-pot, scenario comparison and PDF export
 * stay app-only (Pro).
 *
 * Tax year: 2026/27 (England, Wales, Northern Ireland only).
 * NOT FINANCIAL ADVICE - see privacy.html.
 */
(function (global) {
  "use strict";

  var C = {
    personalAllowance: 12570.0,
    personalAllowanceTaperThreshold: 100000.0,
    basicRateThreshold: 50270.0,
    higherRateThreshold: 125140.0,
    basicRate: 0.20,
    higherRate: 0.40,
    additionalRate: 0.45,
    lumpSumAllowance: 268275.0,
    pclsStandardFraction: 0.25,
    fullStatePensionAnnual: 12547.60
  };

  // Gross band starts and the marginal rate ABOVE each one. 100,000 to
  // 125,140 is an effective 60% band: the Personal Allowance shrinks by
  // £1 for every £2 earned over 100,000.
  var grossBands = [
    [0, 0],
    [C.personalAllowance, C.basicRate],
    [C.basicRateThreshold, C.higherRate],
    [C.personalAllowanceTaperThreshold, C.higherRate * 1.5],
    [C.higherRateThreshold, C.additionalRate]
  ];

  function round2(v) { return Math.round(v * 100) / 100; }

  function rawIncomeTax(income) {
    var allowance = Math.max(0, C.personalAllowance - Math.max(0, income - C.personalAllowanceTaperThreshold) / 2);
    var taxable = Math.max(0, income - allowance);
    var basicBand = C.basicRateThreshold - C.personalAllowance;
    return Math.min(taxable, basicBand) * C.basicRate
      + Math.max(0, Math.min(taxable, C.higherRateThreshold) - basicBand) * C.higherRate
      + Math.max(0, taxable - C.higherRateThreshold) * C.additionalRate;
  }

  function calculateIncomeTax(taxableIncome) {
    return round2(rawIncomeTax(taxableIncome));
  }

  function grossIncomeForTargetNet(targetNet) {
    var band = grossBands[0];
    for (var i = 0; i < grossBands.length; i++) {
      var start = grossBands[i][0];
      if (start - rawIncomeTax(start) <= targetNet) band = grossBands[i];
    }
    var netAtStart = band[0] - rawIncomeTax(band[0]);
    return round2(band[0] + (targetNet - netAtStart) / (1 - band[1]));
  }

  function calculatePCLS(potValue, lsaAlreadyUsed) {
    lsaAlreadyUsed = lsaAlreadyUsed || 0.0;
    var standardPCLS = potValue * C.pclsStandardFraction;
    var lsaRemaining = Math.max(0.0, C.lumpSumAllowance - lsaAlreadyUsed);
    var actualPCLS = Math.min(standardPCLS, lsaRemaining);
    return {
      standard25pctPCLS: round2(standardPCLS),
      actualTaxFreePCLS: round2(actualPCLS),
      cappedByLSA: actualPCLS < standardPCLS
    };
  }

  function incomeTargetDrawdown(targetAnnualNetIncome, includeStatePension, statePensionAnnual) {
    includeStatePension = includeStatePension !== false;
    // NOT "statePensionAnnual || default" - that treats an explicit,
    // intentional £0 override the same as "not supplied", silently
    // ignoring it. Only fall back when the caller genuinely passed
    // nothing (undefined).
    statePensionAnnual = statePensionAnnual === undefined ? C.fullStatePensionAnnual : statePensionAnnual;
    var statePension = includeStatePension ? statePensionAnnual : 0.0;
    var statePensionTax = calculateIncomeTax(statePension);
    var statePensionNet = statePension - statePensionTax;

    if (targetAnnualNetIncome <= statePensionNet) {
      return {
        statePensionAnnual: round2(statePension),
        requiredTaxableWithdrawal: 0.0,
        totalTaxableIncome: round2(statePension),
        estimatedTax: round2(statePensionTax),
        estimatedNetIncome: round2(statePensionNet),
        note: "Your State Pension alone already meets or exceeds this target."
      };
    }

    var totalTaxable = grossIncomeForTargetNet(targetAnnualNetIncome);
    var withdrawal = Math.max(0.0, totalTaxable - statePension);
    var tax = calculateIncomeTax(totalTaxable);
    var net = totalTaxable - tax;

    return {
      statePensionAnnual: round2(statePension),
      requiredTaxableWithdrawal: round2(withdrawal),
      totalTaxableIncome: round2(totalTaxable),
      estimatedTax: round2(tax),
      estimatedNetIncome: round2(net),
      note: null
    };
  }

  function yearsPotLasts(remainingPot, annualWithdrawal) {
    if (!(annualWithdrawal > 0)) return null;
    return Math.round((remainingPot / annualWithdrawal) * 10) / 10;
  }

  global.DrawTargetEngine = {
    calculateIncomeTax: calculateIncomeTax,
    grossIncomeForTargetNet: grossIncomeForTargetNet,
    calculatePCLS: calculatePCLS,
    incomeTargetDrawdown: incomeTargetDrawdown,
    yearsPotLasts: yearsPotLasts,
    constants: C
  };
})(window);
