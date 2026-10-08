/*
 * Wires the hero's preview card to the real engine (calculator-engine.js)
 * - this is the site's actual free-tier calculator, not a mockup. Single
 * pot, State Pension included at the full default rate (the app's
 * Settings override is a Pro/app-only refinement, out of scope here).
 */
(function () {
  "use strict";

  function formatGBP(n) {
    var rounded = Math.round(n);
    return "£" + rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  function parseDigits(str) {
    var digits = (str || "").replace(/[^\d]/g, "");
    return digits === "" ? 0 : parseInt(digits, 10);
  }

  function liveFormat(input) {
    input.addEventListener("input", function () {
      var digits = input.value.replace(/[^\d]/g, "");
      input.value = digits === "" ? "" : formatGBP(parseInt(digits, 10)).slice(1);
    });
  }

  function run() {
    var incomeInput = document.getElementById("calcIncome");
    var potInput = document.getElementById("calcPot");
    var button = document.getElementById("calcButton");
    var resultNet = document.getElementById("resultNet");
    var resultWithdrawal = document.getElementById("resultWithdrawal");
    var pclsRow = document.getElementById("resultPclsRow");
    var resultPcls = document.getElementById("resultPcls");
    var noteEl = document.getElementById("resultNote");
    if (!incomeInput || !button) return;

    liveFormat(incomeInput);
    if (potInput) liveFormat(potInput);

    function calculate() {
      var engine = window.DrawTargetEngine;
      var income = parseDigits(incomeInput.value);
      var pot = potInput ? parseDigits(potInput.value) : 0;

      var drawdown = engine.incomeTargetDrawdown(income, true, engine.constants.fullStatePensionAnnual);
      resultNet.textContent = formatGBP(drawdown.estimatedNetIncome);
      resultWithdrawal.textContent = formatGBP(drawdown.requiredTaxableWithdrawal);

      if (pot > 0) {
        var pcls = engine.calculatePCLS(pot, 0);
        resultPcls.textContent = formatGBP(pcls.actualTaxFreePCLS);
        pclsRow.hidden = false;
      } else {
        pclsRow.hidden = true;
      }

      if (drawdown.note) {
        noteEl.textContent = drawdown.note;
        noteEl.hidden = false;
      } else if (drawdown.requiredTaxableWithdrawal > 0) {
        noteEl.textContent = "Taken as flexible drawdown or UFPLS, this taxable withdrawal would trigger the MPAA (Money Purchase Annual Allowance): the most you can pay into money purchase pensions with tax relief drops from £60,000 to £10,000 a year, permanently.";
        noteEl.hidden = false;
      } else {
        noteEl.hidden = true;
      }
    }

    button.addEventListener("click", calculate);
    incomeInput.addEventListener("input", calculate);
    if (potInput) potInput.addEventListener("input", calculate);

    calculate();
  }

  document.addEventListener("DOMContentLoaded", run);
})();
