(() => {
  "use strict";

  const config = {
    characterId: "char_004",
    currency: "EUR",
    currencySymbol: "€",

    opening: {
      date: "2026-09-20",
      cash: 180,
      note: "物語開始時点。2026年9月分の固定費は支払済みとして開始し、10月分から台帳で処理する。"
    },

    dayLabor: {
      noWork: { label: "仕事なし", min: 0, max: 0, defaultPay: 0 },
      marketCargo: { label: "市場の荷運び", min: 55, max: 75, defaultPay: 65 },
      portCargo: { label: "港の荷運び", min: 65, max: 90, defaultPay: 75 },
      warehouse: { label: "倉庫仕事", min: 60, max: 80, defaultPay: 70 },
      other: { label: "その他の日雇い", min: 50, max: 70, defaultPay: 60 }
    },

    dailyAutoExpenses: {
      food: 11
    },

    monthlyExpenses: {
      rent: {
        label: "家賃",
        amount: 450,
        dueDay: 1,
        type: "fixed"
      },
      utilities: {
        label: "ガス・水道・光熱費",
        amount: 120,
        dueDay: 5,
        type: "fixed"
      },
      childcare: {
        label: "保育園代（給食費等含む）",
        amount: 80,
        dueDay: 10,
        type: "fixed"
      },
      communications: {
        label: "通信費",
        amount: 25,
        dueDay: 15,
        type: "fixed"
      },
      food: {
        label: "食費",
        amount: 330,
        type: "budget"
      },
      misc: {
        label: "雑費",
        amount: 50,
        type: "budget"
      },
      clothing: {
        label: "衣服費",
        amount: 30,
        type: "budget"
      },
      hygiene: {
        label: "衛生費",
        amount: 35,
        type: "budget"
      }
    }
  };

  const roundMoney = value => Math.round((Number(value) || 0) * 100) / 100;

  const totalMonthlyPlan = () =>
    roundMoney(
      Object.values(config.monthlyExpenses)
        .reduce((sum, item) => sum + item.amount, 0)
    );

  const makeInitialFinanceState = () => ({
    currency: config.currency,
    cash: config.opening.cash,
    currentMonth: "2026-09",
    fixedBillsPaid: {
      rent: true,
      utilities: true,
      childcare: true,
      communications: true
    },
    spentThisMonth: {
      rent: 0,
      utilities: 0,
      childcare: 0,
      food: 0,
      communications: 0,
      misc: 0,
      clothing: 0,
      hygiene: 0
    },
    earnedThisMonth: 0,
    ledger: [],
    appliedTransactionIds: []
  });

  const cloneState = finance =>
    JSON.parse(JSON.stringify(finance || makeInitialFinanceState()));

  const assertUniqueTransaction = (state, id) => {
    if (!id) throw new Error("transaction id is required");
    if (state.appliedTransactionIds.includes(id)) return false;
    state.appliedTransactionIds.push(id);
    return true;
  };

  const addIncome = (finance, {
    id,
    date,
    workType = "other",
    amount = null,
    note = ""
  }) => {
    const state = cloneState(finance);
    if (!assertUniqueTransaction(state, id)) return state;

    const rule = config.dayLabor[workType] || config.dayLabor.other;
    const pay = roundMoney(amount == null ? rule.defaultPay : amount);

    if (pay < rule.min || pay > rule.max) {
      throw new Error(`day labor pay out of range: ${pay} (${rule.min}-${rule.max})`);
    }

    state.cash = roundMoney(state.cash + pay);
    state.earnedThisMonth = roundMoney(state.earnedThisMonth + pay);
    state.ledger.push({
      id,
      date,
      kind: "income",
      category: "dayLabor",
      workType,
      label: rule.label,
      amount: pay,
      note
    });
    return state;
  };

  const addExpense = (finance, {
    id,
    date,
    category,
    amount,
    note = ""
  }) => {
    const state = cloneState(finance);
    if (!assertUniqueTransaction(state, id)) return state;

    const rule = config.monthlyExpenses[category];
    if (!rule) throw new Error(`unknown expense category: ${category}`);

    const cost = roundMoney(amount);
    if (cost < 0) throw new Error("expense must be >= 0");

    state.cash = roundMoney(state.cash - cost);
    state.spentThisMonth[category] = roundMoney(
      (state.spentThisMonth[category] || 0) + cost
    );
    state.ledger.push({
      id,
      date,
      kind: "expense",
      category,
      label: rule.label,
      amount: cost,
      note
    });
    return state;
  };

  const startMonth = (finance, yearMonth) => {
    const state = cloneState(finance);
    if (state.currentMonth === yearMonth) return state;

    state.currentMonth = yearMonth;
    state.fixedBillsPaid = {
      rent: false,
      utilities: false,
      childcare: false,
      communications: false
    };
    state.spentThisMonth = {
      rent: 0,
      utilities: 0,
      childcare: 0,
      food: 0,
      communications: 0,
      misc: 0,
      clothing: 0,
      hygiene: 0
    };
    state.earnedThisMonth = 0;
    return state;
  };

  const applyDailyLivingCosts = (finance, { date }) => {
    let state = cloneState(finance);

    for (const [category, amount] of Object.entries(config.dailyAutoExpenses)) {
      state = addExpense(state, {
        id: `${date}:daily:${category}`,
        date,
        category,
        amount,
        note: "日次生活費"
      });
    }

    return state;
  };

  const applyDueFixedBills = (finance, { date }) => {
    let state = cloneState(finance);
    const day = Number(String(date).slice(-2));

    for (const [category, rule] of Object.entries(config.monthlyExpenses)) {
      if (rule.type !== "fixed") continue;
      if (state.fixedBillsPaid[category]) continue;
      if (day < rule.dueDay) continue;

      state = addExpense(state, {
        id: `${date}:fixed:${category}`,
        date,
        category,
        amount: rule.amount,
        note: "月固定費"
      });
      state.fixedBillsPaid[category] = true;
    }

    return state;
  };

  const summary = finance => {
    const state = cloneState(finance);
    return {
      currency: state.currency,
      cash: state.cash,
      earnedThisMonth: state.earnedThisMonth,
      spentThisMonth: { ...state.spentThisMonth },
      monthlyPlan: totalMonthlyPlan(),
      ledger: [...state.ledger]
    };
  };

  window.SimulationCharacter004Economy = Object.freeze({
    config: Object.freeze(config),
    totalMonthlyPlan,
    makeInitialFinanceState,
    addIncome,
    addExpense,
    startMonth,
    applyDailyLivingCosts,
    applyDueFixedBills,
    summary
  });
})();