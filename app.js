const express = require('express')
const path = require('path')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const bcrypt = require('bcrypt')
const jwttoken = require('jsonwebtoken')

const databasePath = join(__dirname, 'covid19IndiaPortal.db')

const app = express()

app.use(json())

let db = null

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: databasePath,
      driver: Database,
    })

    app.listen(3000, () =>
      console.log('Server Running at http://localhost:3000/'),
    )
  } catch (error) {
    console.log(`DB Error: ${error.message}`)
    process.exit(1)
  }
}

initializeDbAndServer()

const convertion = obj => {
  return {
    stateId = obj.state_id,
    stateName = obj.state_name,
    population = obj.population,
  }
}
const convertionOfdis = obj => {
  return {
    districtId = obj.district_id,
    districtName = obj.district_name,
    stateId = obj.state_id,
    cases = obj.cases,
    cured = obj.cured,
    active = obj.active,
    deaths = obj.deaths,
  }
}

const check = (request, response, next) => {
  let jwt
  const header = await request.headers['authorization']
  if (header != undefined) {
    const jwt = header.split(' ')[1]
  }
  if (jwt == undefined) {
    response.status(401)
    response.send('Invalid jwt Token')
  } else {
    jwttoken.verify(jwt, 'secretrkey', async (error, payLoad) => {
      if (error) {
        response.send('Invalid JWT Token')
      } else {
        next()
      }
    })
  }
}
// api 1 add the user

app.post('/login/', async (request, response) => {
  const {username, password} = request.body
  try {
    const get_data = `SELECT * FROM user WHERE username = '${username}`
    const User = await db.get(get_data)

    if (User === undefined) {
      response.status(400)
      response.send(`Invalid user`)
    } else {
      const passwordCheck = await bcrypt.compare(password, User.password)
      if (!password) {
        response.send(400)
        response.send(`Invalid password`)
      } else {
        const payLoad = {username: username}
        const token = await jwttoken.sign(payLoad, 'secretkey')
        response.send({token})
      }
    }
  } catch (e) {
    console.log(`Internal error` + e)
  }
})
//api 2 get data from state table

app.get('/states/', check, async (request, response) => {
  try {
    const details_state = `SELECT * FROM state ORDER BY state_id`
    const responesDb = await db.all(details_state)
    response.send(responesDb.map(each => convertion(each)))
  } catch (e) {
    console.log(`get data api error` + e)
  }
})

//api 3 get based id in table
app.get('/states/:stateId/', check, async (request, response) => {
  try {
    const {stateId} = request.params
    const detaileQuery = `SELECT * FROM state
    WHERE state_id = ${stateId}`
    const detaileQueryRes = await db.get(detaileQuery)
    response.send(convertion(detaileQueryRes))
  } catch (e) {
    console.log('internalError' + e)
  }
})

// api 4 post in district table

app.post('/districts/', async (request, response) => {
  try {
    const {districtName, stateId, cases, cured, active, deaths} = request.body
    const insertQuery = `INSERT INTO district(district_name,state_id,cases,cured,active,deaths) 
    VALUES('${districtName}',${stateId},${cases},${cured},${active},${deaths});`
    await db.run(insertQuery)
    response.send(`District Successfully Added`)
  } catch (e) {
    console.log('internalError' + e)
  }
})
// 5 get data from district table

app.get('/districts/:districtId/', async (request, respones) => {
  try {
    const {districtId} = district.params
    const district_details = `SELECT * FROM district WHERE district_id = ${districtId}`
    const response_district = await db.get(district_details)
    respones.send(convertionOfdis(response_district))
  } catch (e) {
    console.log('internalError' + e)
  }
})
// delete element when districtId match
app.delete('/districts/:districtId/', async (request, respones) => {
  try {
    const {districtId} = request.params
    const delete_data = `DELETE FROM district WHERE district_id = ${districtId};`
    const respones_delete = await db.run(delete_data)
    respones.send(`District Removed`)
  } catch (e) {
    console.log('InterError' + e)
  }
})
// update date in table

app.put('/districts/:districtId/', async (request, response) => {
  try {
    const {districtId} = request.params
    const {districtName, stateId, cases, cured, active, deaths} = request.body
    const updateQuery = `UPDATE district
     SET 
     district_name = '${districtName}',
     state_id = ${stateId},
     cases = ${cases},
     cured = ${cured},
     active = ${active},
     deaths = ${deaths};`
    await db.run(updateQuery)
    response.send(`District Details Updated`)
  } catch (e) {
    console.log('internalError' + e)
  }
})
// get state deatils
app.get('/states/:stateId/stats/', async (request, response) => {
  try {
    const {stateId} = request.params
    const state_details = `SELECT 
    SUM(cases),
    SUM(cured),
    SUM(active),
    SUM(deaths),
    FROM district
    WHERE state_id = ${stateId}`
    const respones_state = await db.get(state_details)
    resposne.send({
      totalCases: respones_state['SUM(cases)'],
      totalCured: respones_state['SUM(cured)'],
      totalActive: respones_state['SUM(active)'],
      totalDeaths: respones_state['SUM(deaths)'],
    })
  } catch (e) {
    console.log('internalError' + e)
  }
})

module.exports = app
