---
title: beancount 前置的理论梳理
date: 2026-03-10 21:43
tags:
  - beancount
---
[official web](https://beancount.github.io/docs/the_double_entry_counting_method.html#introduction)

# 为什么 Income 是负数
![[/pics/Pasted image 20260310214556.png]]

Her gross salary received in this example is recorded as $-2,905 (I’ll explain the sign in a moment). $905 is set aside for taxes. Her “net” salary of $2,000, the remainder, is deposited in her “Checking” account and the resulting balance of that account is $2,921 (the previous balance of $921 + $2,000 = $2,921). This transaction has three postings: (+2,000) + (-2,905) + (+905) = 0. The double-entry rule is respected.

Now, you may ask: Why is her salary recorded as a negative number? The reasoning here is similar to that of the credit card above, though perhaps a bit more subtle. These accounts exist to track all the amounts from the owner’s point-of-view. The owner gives out work, and receives money and taxes in exchange for it (positive amounts). The work given away is denominated in dollar units. It “leaves” the owner (imagine that the owner has _potential work_ stored in her pocket and as she goes into work every day sprinkles that work potential giving it to the company). The owner _gave_ $2,905’s worth of work away. We want to track how much work was given, and it’s done with the “Salary” account. That’s her gross salary.

# 账户的分类
## **Balance**（余额） **Delta**（差额） 是两种评估纬度

在某个时间点余额有意义的账户（Account）称为 **balance sheet accounts**（资产负债表账户）： Assets（资产） 和 Liabilities（负债）。

在某个时间段差额有意义的账户称为 **income statement accounts** （损益表账户）：Income（收入） 和 Expenses（支出）

## Sign
通常来说，一个账户的 balance 总是正或者总是负。

对于 Balance sheet account，Asset 通常是正 balance，Liabilities 通常是负 balance。

对于 Income statement account，Expenses 通常是正，Income 通常是负

总结如下：

|                                                                                        | Balance: Positive (+) | Balance: Negative (-) |
| -------------------------------------------------------------------------------------- | --------------------- | --------------------- |
| Balance matters  <br>**at a point** in time<br><br>(Balance Sheet)                     | **Assets**            | **Liabilities**       |
| **Change** in balance matters  <br>**over a period** of time<br><br>(Income Statement) | **Expenses**          | **Income**            |
- **Assets**(+): assets accounts represent *something the owner has*. A canonical example is banking accounts. Investments are also assets. Home itself is considered an asset.
- **Liabilities(-)**: A liability account represents _something the owner owes_. The most common example is a credit card. A loan is also a liability account.
- **Expenses(+)**: An expense account represents *something you've received*, perhaps by exchanging something else to purchase it. This type of account will seem pretty natural: food, drinks, clothing, rent, flights, hotels and most other categories of things you typically spend your disposable income on. Taxes are also typically tracked by an expense account.
- **Income(-)**: An income account is used to count *something you've given away* in order to receive something else (typically assets or expenses). For most people with jobs, that is the value of their time (a salary income).

# Income Statement
One kind of common information that is useful to extract from the list of transactions is a summary of changes in income statement accounts during a particular period of time. 'net income' 净收益/净利润。

Income 和 Expense 求和，如果为负说明存在 asset，如果为负说明有 liability。

公司的 income statement 反应了特定时间段的财务变化。

# Clear Income
上面的 Income statement 是一段时间，如果是创建账户以来的 income statement，beancount 提供了 clear income 的操作。

# Equity (第五种账户)

The account that receives those previously accumulated incomes is called “Previous Earnings”. It lives in a fifth and final type of accounts: **Equity**. 

最后介绍这种账户，因为这个账户是在 report 是才用，用户基本不会手动操作，beancount 会自动操作，比如 clearning net income 的时候。

# Credits & Debits
为了避免各种专业的会记术语与账目处理，beancount 不引入严格的贷方，借方的概念。
# Accounting Equations[](https://beancount.github.io/docs/the_double_entry_counting_method.html#accounting-equations "Permanent link")

In light of the previous sections, we can easily express the accounting equations in signed terms. If,

- A = the sum of all Assets postings
- L = the sum of all Liabilities postings
- X = the sum of all Expenses postings
- I = the sum of all Income postings
- E = the sum of all Equity postings

We can say that:

```
A + L + E + X + I = 0
```

This follows from the fact that

```
sum(all postings) = 0
```

Which follows from the fact that each transaction is guaranteed to sum up to zero (which is enforced by Beancount):

```
for all transactions t, sum(postings of t) = 0
```

Moreover, the sum of postings from Income and Expenses is the Net Income (NI):

```
NI = X + I
```

If we adjust the equity to reflect the total Net Income effect by clearing the income to the Equity retained earnings account, we get an updated Equity value (E’):

```
E’ = E + NI = E + X + I
```

And we have a simplified accounting equation:

```
A + L + E’ = 0
```

If we were to adjust the signs for credits and debits (see previous section) and have sums that are all positive number, this becomes the familiar accounting equation:

```
Assets - Liabilities = Equity
```

As you can see, it’s much easier to just always add up the numbers.
# reference
- [实操入门](https://www.skyue.com/19101819.html)
- [byvoid1](https://byvoid.com/zht/blog/beancount-bookkeeping-1/)
- [byvoid2](https://byvoid.com/zhs/blog/beancount-bookkeeping-2/)
- [byvoid3](https://byvoid.com/zhs/blog/beancount-bookkeeping-3/)