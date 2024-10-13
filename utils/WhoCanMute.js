const allowedRoles = {
    "mute":[
        '1283590997011333184',
        '1282365181518811158'
    ],
    "acceptReport":[
        "1283604982796648499"
    ],
    "develop":[
        "1279084642082881647"
    ],
    "startGame":[
        "1279084642082881647",
        "1284292545555333183"
    ]
}

const checkIfCanMute = (member,usage) =>{
    const roles = member.roles.cache
    const rolesTocheck = allowedRoles[usage]
    console.log(rolesTocheck);
    for(let k in rolesTocheck){
        if(roles.has(rolesTocheck[k])) return true;
    }
    return false;
}


module.exports = {
    checkIfCanMute
}