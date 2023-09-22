let api = require('@actual-app/api');

const express = require('express');
const app = express();
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

BUDGET_ID = process.env.BUDGET_ID;
SERVER_URL = process.env.SERVER_URL;
SERVER_PASSWORD = process.env.SERVER_PASSWORD;


app.post('/', (req, res, next) => {
  console.log(req.body);
  var result = addTransaction(req.body.accountId, getCurrentDateFormatted(), req.body.amount, req.body.payee, req.body.notes);
  if(result){
    res.send('Success');
  }else{
    res.json({ error: 'Internal error, please review docker logs.' })
  }
});

function addTransaction(accountId, transactionDate, amount, payee, notes){
  try {
    (async () => {
      await api.init({
        // Budget data will be cached locally here, in subdirectories for each file.
        dataDir: '/tmp/actual',
        // This is the URL of your running server
        serverURL: SERVER_URL,
        // This is the password you use to log into the server
        password: SERVER_PASSWORD,
      });
      var current_date = getCurrentDatTimeFormatted();
      notes= 'API-created '+current_date+" - "+notes;

      // This is the ID from Settings → Show advanced settings → Sync ID
      await api.downloadBudget(BUDGET_ID);

      await api.importTransactions(accountId, [
        {
          date: transactionDate,
          amount: amount,
          payee_name: payee,
          notes: notes,
        },
      ]);

      await api.shutdown();
    })();
    return true;
  }catch(e) {
    console.log(e);
    return false;
  }
}

function getCurrentDatTimeFormatted(){
  let date_time = new Date();
  let date = ("0" + date_time.getDate()).slice(-2);
  let month = ("0" + (date_time.getMonth() + 1)).slice(-2);
  let year = date_time.getFullYear();
  let hours = date_time.getHours();
  let minutes = date_time.getMinutes();
  let seconds = date_time.getSeconds();
  return (year + "-" + month + "-" + date + " " + hours + ":" + minutes + ":" + seconds);
}



function getCurrentDateFormatted(){
  let date_time = new Date();
  let date = ("0" + date_time.getDate()).slice(-2);
  let month = ("0" + (date_time.getMonth() + 1)).slice(-2);
  let year = date_time.getFullYear();
  return (year + "-" + month + "-" + date );
}


app.listen(8080);