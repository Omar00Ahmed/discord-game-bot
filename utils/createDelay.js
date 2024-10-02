

async function Sleep(timeInMs){
    await new Promise(resolve => setTimeout(resolve, timeInMs));
    return;
}

module.exports ={
    Sleep,
}