// SPDX-License-Identifier: MIT
pragma solidity >=0.6.12 <0.9.0;

contract CostTracking {

    uint public expenseCount;
    mapping(address => uint[]) public userToExpenseIndex;
    mapping(uint => Expense) public expenses;

    event ExpenseAdded(address indexed user, uint indexed expenseIndex);
    event ExpenseCanceled(address indexed user, uint indexed expenseIndex);
    event ExpenseModified(address indexed user, uint indexed expenseIndex);

    struct Expense {
        uint amount;
        uint date;
        string category;
        string description;
        bool canceled;
    }

    function addExpense(
        uint _amount,
        uint _date,
        string memory _category,
        string memory _description
    ) external {
        require(_amount > 0, "Amount must be greater than zero");
        require(_date <= block.timestamp, "Date must be in the past");

        expenses[expenseCount] = Expense({
            amount: _amount,
            date: _date,
            category: _category,
            description: _description,
            canceled: false
        });
        
        userToExpenseIndex[msg.sender].push(expenseCount);
        emit ExpenseAdded(msg.sender, expenseCount);
        
        expenseCount++;
    }

    function cancelExpense(uint _index) external {
        require(expenses[_index].canceled == false, "Expense is already canceled");
        require(userToExpenseIndex[msg.sender].length > _index, "Expense index does not exist");

        expenses[_index].canceled = true;
        emit ExpenseCanceled(msg.sender, _index);
    }

    function modifyExpense(
        uint _index,
        uint _amount,
        uint _date,
        string memory _category,
        string memory _description
    ) external {
        require(userToExpenseIndex[msg.sender].length > _index, "Expense index does not exist");
        require(_amount > 0, "Amount must be greater than zero");
        require(_date <= block.timestamp, "Date must be in the past");

        Expense storage expense = expenses[_index];
        expense.amount = _amount;
        expense.date = _date;
        expense.category = _category;
        expense.description = _description;
        
        emit ExpenseModified(msg.sender, _index);
    }

    function getUserExpenses(address _user) external view returns (Expense[] memory) {
    uint[] storage index = userToExpenseIndex[_user];
    Expense[] memory userExpenses = new Expense[](index.length);

    if (index.length > 0) {
        for (uint i = 0; i < index.length; i++) {
            userExpenses[i] = expenses[index[i]];
        }
    }

    return userExpenses;
}

}