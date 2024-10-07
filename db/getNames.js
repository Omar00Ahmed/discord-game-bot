const db = require("./SqliteDb");




const selectAllNames = () => {
    return new Promise((resolve, reject) => {
        db.all("SELECT * FROM sanalikus", [], (err, rows) => {
            if (err) {
                return reject(err); // Return error if query fails
            }
            resolve(rows); // Return rows if query is successful
        });
    });
};

const InsertNames = (names)=>{
    return new Promise((resolve, reject) => {
        db.run("INSERT INTO sanalikus (word,meaning) VALUES (?,?)", [names[0],names[1]], function(err) {
            if (err) {
                return reject(err); // Return error if query fails
            }
            resolve(this.lastID); // Return last inserted id if query is successful
        });
    });
}

module.exports = {
    selectAllNames,
    InsertNames,
};