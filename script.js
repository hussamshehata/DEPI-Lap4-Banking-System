
// Function to create a new bank account
function createBankAccount(customerData) {
  if (!customerData.firstName || !customerData.lastName) {
    throw new Error("First and last name are required");
  }
  if (customerData.initialDeposit < 50) {
    throw new Error("Minimum initial deposit is $50");
  }

  const accountNumber = Math.floor(1000000000 + Math.random() * 9000000000).toString();
  
  return {
    accountNumber,
    firstName: customerData.firstName,
    lastName: customerData.lastName,
    balance: customerData.initialDeposit,
    createdAt: new Date().toISOString(),
    transactions: [],
    type: customerData.type || "CHECKING", // Default to CHECKING if not provided
    status: "ACTIVE",
    statusHistory: []
  };
}
console.log(createBankAccount({ firstName: "John", lastName: "Doe", initialDeposit: 100, type: "SAVINGS" }));
// Function to process a deposit into the bank account
function processDeposit(account, amount) {
  if (amount <= 0) throw new Error("Deposit amount must be positive");

  account.balance += amount;
  account.transactions.push({
    type: "DEPOSIT",
    amount,
    date: new Date().toISOString(),
    newBalance: account.balance
  });

  return account;
}
// Function to process a withdrawal from the bank account
function processWithdrawal(account, amount) {
  if (amount <= 0) throw new Error("Withdrawal amount must be positive");

  if (account.balance >= amount) {
    account.balance -= amount;
    account.transactions.push({
      type: "WITHDRAWAL",
      amount,
      date: new Date().toISOString(),
      newBalance: account.balance
    });
  } else {
    account.balance -= 5; // Overdraft penalty
    account.transactions.push({
      type: "OVERDRAFT_ATTEMPT",
      amount,
      date: new Date().toISOString(),
      penalty: 5
    });
    throw new Error("Insufficient funds - $5 penalty applied");
  }

  return account;
}
// Function to transfer funds between two accounts
function transferFunds(fromAccount, toAccount, amount) {
  if (amount <= 0) throw new Error("Transfer amount must be positive");
  if (fromAccount.balance < amount) throw new Error("Insufficient funds");

  // Debit from account
  fromAccount.balance -= amount;
  fromAccount.transactions.push({
    type: "TRANSFER_OUT",
    to: toAccount.accountNumber,
    amount,
    date: new Date().toISOString()
  });

  // Credit to account
  toAccount.balance += amount;
  toAccount.transactions.push({
    type: "TRANSFER_IN",
    from: fromAccount.accountNumber,
    amount,
    date: new Date().toISOString()
  });

  return [fromAccount, toAccount];
}
// Function to calculate and apply monthly interest for savings accounts
function calculateMonthlyInterest(account) {
  if (account.type !== "SAVINGS" || account.balance < 500) return account;

  const interest = account.balance * 0.00167; // 0.167% monthly
  account.balance += interest;
  account.transactions.push({
    type: "INTEREST",
    amount: parseFloat(interest.toFixed(2)),
    date: new Date().toISOString()
  });

  return account;
}
// Function to get filtered transaction history
function getFilteredTransactions(account, filters = {}) {
  let results = account.transactions;

  // Date filtering
  if (filters.startDate) {
    results = results.filter(t => new Date(t.date) >= new Date(filters.startDate));
  }
  if (filters.endDate) {
    results = results.filter(t => new Date(t.date) <= new Date(filters.endDate));
  }

  // Type filtering
  if (filters.type) {
    results = results.filter(t => t.type === filters.type);
  }

  // Sorting
  return results.sort((a, b) => new Date(b.date) - new Date(a.date));
}
// Function to freeze or unfreeze an account
function setAccountStatus(account, action, authorizedBy) {
  if (!["FREEZE", "UNFREEZE"].includes(action)) {
    throw new Error("Invalid action - must be FREEZE or UNFREEZE");
  }

  if (action === "FREEZE" && !authorizedBy.startsWith("manager")) {
    throw new Error("Only managers can freeze accounts");
  }

  account.status = action === "FREEZE" ? "FROZEN" : "ACTIVE";
  
  account.statusHistory = account.statusHistory || [];
  account.statusHistory.push({
    action,
    by: authorizedBy,
    date: new Date().toISOString()
  });

  return account;
}
// Function to process a withdrawal with a daily limit of $500
function processLimitedWithdrawal(account, amount) {
  const today = new Date().toISOString().split('T')[0];
  const todaysWithdrawals = account.transactions
    .filter(t => t.type === "WITHDRAWAL" && t.date.startsWith(today))
    .reduce((sum, t) => sum + t.amount, 0);

  if (todaysWithdrawals + amount > 500) {
    throw new Error(`Daily withdrawal limit exceeded ($500 max)`);
  }

  return processWithdrawal(account, amount); // Reuse withdrawal logic
}
// Function to validate password strength
function validatePassword(password) {
  const errors = [];
  const commonPasswords = ["password", "123456", "qwerty"];

  if (password.length < 12) {
    errors.push("Password must be at least 12 characters");
  }
  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }
  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }
  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number");
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push("Password must contain a special character");
  }
  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push("Password is too common");
  }

  return {
    valid: errors.length === 0,
    reasons: errors
  };
}
// Function to check for suspicious activity in the account
function checkForSuspiciousActivity(account) {
  const alerts = [];
  const withdrawals = account.transactions
    .filter(t => t.type === "WITHDRAWAL")
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  // Check for high-value transactions
  account.transactions.forEach(t => {
    if (t.amount > 10000) {
      alerts.push(`High-value transaction: $${t.amount} ${t.type.toLowerCase()}`);
    }
  });

  // Check for rapid withdrawals
  for (let i = 2; i < withdrawals.length; i++) {
    const timeDiff = (new Date(withdrawals[i].date) - new Date(withdrawals[i-2].date)) / (1000 * 60);
    if (timeDiff < 5) {
      alerts.push(`Rapid withdrawals: ${i+1} transactions within ${Math.ceil(timeDiff)} minutes`);
      break;
    }
  }

  return {
    isSuspicious: alerts.length > 0,
    alerts
  };
}