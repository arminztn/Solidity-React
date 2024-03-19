import React, { useState, useEffect } from 'react';
import Web3 from 'web3';
import CostTrackingContract from './CostTracking.json';
import './App.css';

//const API_KEY_URL = 'https://sepolia.infura.io/v3/API_KEY; // Infura Endpoint URL
const CONTRACT_ADDRESS = '0xfEAecb29C7112056BB108746b32117b328157c87'; // Contract address

function App() {
  const [web3, setWeb3] = useState(null);
  const [contract, setContract] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [index, setIndex] = useState('');
  const [account, setAccount] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [sortBy, setSortBy] = useState(null);
  const [showExpenses, setShowExpenses] = useState(false);
  const [expenseAnalysis, setExpenseAnalysis] = useState({});

  useEffect(() => {
    async function init() {
      try {
        if (window.ethereum) {
          const web3Instance = new Web3(window.ethereum);
          setWeb3(web3Instance);

          const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
          setAccount(accounts[0]);

          const contract = new web3Instance.eth.Contract(
            CostTrackingContract.abi,
            CONTRACT_ADDRESS
          );
          setContract(contract);

          console.log('Successfully connected to Ethereum network.');

          const userExpenses = await contract.methods.getUserExpenses(account).call();
          const parsedExpenses = userExpenses.map((expense, index) => ({
            ...expense,
            index: index // Assigning index to each expense
          }));
          console.log("Parsed Expenses:", parsedExpenses);
          setExpenses(parsedExpenses);
        } else {
          console.error('MetaMask not detected');
        }
      } catch (error) {
        console.error('Error connecting to Ethereum network:', error);
      }
    }
    init();
  }, [account]);

  const handleAddExpense = async () => {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      console.error('Amount must be a non-negative number');
      return;
    }

    const parsedDate = new Date(date);
    const timestamp = Math.floor(parsedDate.getTime() / 1000); // Convert to Unix timestamp in seconds

    console.log("Parsed Amount:", parsedAmount);
    console.log("Parsed Date:", parsedDate);
    console.log("Timestamp:", timestamp);

    await contract.methods.addExpense(parsedAmount, timestamp, category, description).send({ from: account });
    const userExpenses = await contract.methods.getUserExpenses(account).call();
    const parsedExpenses = userExpenses.map((expense, index) => ({
      ...expense,
      index: index
    }));
    console.log("Parsed Expenses after addExpense:", parsedExpenses);
    setExpenses(parsedExpenses);
    setAmount('');
    setDate('');
    setCategory('');
    setDescription('');
  };

  const handleModifyExpense = async (_index) => {
    const selectedExpense = expenses.find(expense => expense.index === _index);

    // Check if the selected expense exists
    if (!selectedExpense) {
      console.error('Expense with the given index not found');
      return;
    }

    // Fill form fields with existing values of the selected expense
    setAmount(selectedExpense.amount.toString());
    setDate(new Date(Number(selectedExpense.date) * 1000).toISOString().split('T')[0]);
    setCategory(selectedExpense.category);
    setDescription(selectedExpense.description);

    setIndex(_index);

    setShowForm(true);
  };

  const handleCancelExpense = async (_index) => {
    await contract.methods.cancelExpense(_index).send({ from: account });
    const userExpenses = await contract.methods.getUserExpenses(account).call();
    const parsedExpenses = userExpenses.map((expense, index) => ({
      ...expense,
      index: index
    }));
    setExpenses(parsedExpenses);
  };

  const handleFunctionSubmit = async (event) => {
    event.preventDefault();

    if (index !== '') {
      try {
        // Parse the date from the input field
        const parsedDate = new Date(date);
        const timestamp = Math.floor(parsedDate.getTime() / 1000); // Convert to Unix timestamp in seconds

        // Update the expense with user modifications
        console.log("Modifying expense at index:", index);
        await contract.methods.modifyExpense(index, parseFloat(amount), timestamp, category, description || "").send({ from: account });

        // Fetch updated user expenses and update the state
        const userExpenses = await contract.methods.getUserExpenses(account).call();
        const parsedExpenses = userExpenses.map((expense, index) => ({
          ...expense,
          index: index
        }));
        console.log("Parsed Expenses after modifyExpense:", parsedExpenses);
        setExpenses(parsedExpenses);

        // Reset form fields
        setIndex('');
        setAmount('');
        setDate('');
        setCategory('');
        setDescription('');

        setShowForm(false);
      } catch (error) {
        console.error('Error modifying expense:', error);
      }
    } else {
      try {
        // Parse the date from the input field
        const parsedDate = new Date(date);
        const timestamp = Math.floor(parsedDate.getTime() / 1000); // Convert to Unix timestamp in seconds

        // Add a new expense
        console.log("Adding new expense...");
        await contract.methods.addExpense(parseFloat(amount), timestamp, category, description || "").send({ from: account });

        // Fetch updated user expenses and update the state
        const userExpenses = await contract.methods.getUserExpenses(account).call();
        const parsedExpenses = userExpenses.map((expense, index) => ({
          ...expense,
          index: index
        }));
        console.log("Parsed Expenses after addExpense:", parsedExpenses);
        setExpenses(parsedExpenses);

        // Reset form fields
        setAmount('');
        setDate('');
        setCategory('');
        setDescription('');
      } catch (error) {
        console.error('Error adding new expense:', error);
      }
    }
  };

  // Function to fetch and display all expenses
  const handleViewExpenses = async () => {
    setShowExpenses(true);
    sortExpenses();
  };

  // Function to sort expenses based on the selected parameter
  const sortExpenses = () => {
    let sortedExpenses = [...expenses];
    if (sortBy === 'amount') {
      sortedExpenses.sort((a, b) => Number(a.amount) - Number(b.amount));
    } else if (sortBy === 'date') {
      sortedExpenses.sort((a, b) => Number(a.date) - Number(b.date));
    } else if (sortBy === 'category') {
      sortedExpenses.sort((a, b) => a.category.localeCompare(b.category));
    }
    setExpenses(sortedExpenses);
  };

  useEffect(() => {
    if (showExpenses && sortBy) {
      sortExpenses();
    }
  }, [showExpenses, sortBy]);

  // Calculate total expenses by category
  useEffect(() => {
    const totalExpensesByCategory = {};
    expenses.forEach(expense => {
      if (totalExpensesByCategory.hasOwnProperty(expense.category)) {
        totalExpensesByCategory[expense.category] += 1;
      } else {
        totalExpensesByCategory[expense.category] = 1;
      }
    });
    setExpenseAnalysis(totalExpensesByCategory);
  }, [expenses]);

  return (
    <div className="App">
      <header className="App-header">
        <h1>Cost Tracking DApp</h1>
      </header>
      <main>
        {/* Button to toggle the form visibility */}
        <button onClick={() => setShowForm(!showForm)} style={{ marginRight: '20px' }}>{showForm ? 'Hide Expense Form' : 'Add Expense'}</button>

        {/* Button to view or hide expenses */}
        <button onClick={() => setShowExpenses(!showExpenses)}>{showExpenses ? 'Hide Expenses' : 'View Expenses'}</button>

        {/* Expense form */}
        <form onSubmit={handleFunctionSubmit} className="function-form" style={{ display: showForm ? 'block' : 'none' }}>
          <div className="form-group">
            <h2>Add Expense</h2>
            <label>Amount:</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Date:</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Category:</label>
            <input type="text" value={category} onChange={(e) => setCategory(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Description:</label>
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <button type="submit" className="submit-button">Submit</button>
        </form>

        {/* Sort button */}
        {showExpenses && (
          <div className="sort-options">
            <label>Sort Expenses By: </label>
            <select onChange={(e) => setSortBy(e.target.value)}>
              <option value="">Select</option>
              <option value="amount">Amount</option>
              <option value="date">Date</option>
              <option value="category">Category</option>
            </select>
          </div>
        )}

        {/* Expense analysis */}
        {showExpenses && (
          <div className="expense-analysis">
            <h2>Expense Analysis</h2>
            <h3>Number of expenses for each category:</h3>
            <ul style={{ listStyleType: 'none' }}>
              {Object.entries(expenseAnalysis).map(([category, total]) => (
                <li key={category}>
                  <p>{category}: {total}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Expenses list */}
        {showExpenses && (
          <div className="expenses-list">
            <h2>Expenses</h2>
            <div className="expenses-container">
              {expenses.map((expense) => (
                <div key={expense.index} className="expense-item">
                  <p>Index: {expense.index}</p>
                  <p>Amount: {Number(expense.amount)}</p>
                  <p>Date: {new Date(Number(expense.date) * 1000).toLocaleDateString()}</p>
                  <p>Category: {expense.category}</p>
                  <p>Description: {expense.description}</p>
                  {expense.canceled ? <p>Status: <span style={{ color: 'red' }}>CANCELLED</span></p> : null}
                  <button onClick={() => handleCancelExpense(expense.index)} style={{ marginRight: '10px' }}>Cancel</button>
                  <button onClick={() => handleModifyExpense(expense.index)}>Modify</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );


}

export default App;
