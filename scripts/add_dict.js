// https://my.eudic.net/OpenAPI/Doc_Index
require('dotenv').config()

const axios = require('axios')
const fs = require('fs')
const path = require('path')

const request = axios.create({
  baseURL: 'https://api.frdic.com/api/open/v1/studylist',
  params: {
    language: 'en',
  },
  headers: {
    Authorization: process.env.FRDIC_KEY,
  },
})

request.interceptors.response.use(
  (response) => {
    return response.data.data
  },
  (error) => {
    console.log('error')
    // console.error('status', error.response.status)
    console.error('message', error.message)
    console.error('data', error.response.data)
  },
)

const getCategory = async () => request.get('/category')
const getWords = async (id, params) => request.get(`/words/${id}`, { params })

async function getAllWords() {
  const category = await getCategory()
  const list = await Promise.all(category.map((item) => getWords(item.id, { page: 0, page_size: 1000 })))
  return list
    .flat()
    .reverse()
    .filter((item) => item.exp)
    .map((item) => {
      const exps = item.exp
        .split('<br>')
        .filter(Boolean)
        .map((s) => s.trim())
      return {
        name: item.word,
        trans: exps,
      }
    })
}

function writeFile(content) {
  const file = path.join(__dirname, '../public/dicts/0_study_dayStudy.json')

  //写入文件
  fs.writeFile(file, content, function (err) {
    if (err) {
      return console.log(err)
    }
    console.log('文件创建成功，地址：' + file)
  })
}

function getDictionaryContent() {
  return new Promise((resolve, reject) => {
    const file = path.join(__dirname, '../src/resources/dictionary.ts')
    fs.readFile(file, 'utf-8', (err, contents) => {
      if (err) reject(err)
      resolve(contents)
    })
  })
}

function updateDictionaryContent(content) {
  return new Promise((resolve, reject) => {
    const file = path.join(__dirname, '../src/resources/dictionary.ts')
    fs.writeFile(file, content, 'utf-8', (err, contents) => {
      if (err) reject(err)
      resolve(contents)
    })
  })
}

async function task() {
  const words = await getAllWords()
  const size = words.length
  await writeFile(JSON.stringify(words, null, '\t'))

  const content = await getDictionaryContent()

  const regex = /\/\*{5} replace content start \*{5}([\s\S]+?)\/\*{5} replace content end \*{5}\//

  const newObjectStr = `
   /***** replace content start *****/
      {
        id: '0_study_dayStudy',
        name: '0_study_dayStudy',
        description: '0_study_dayStudy',
        category: '中国考试',
        tags: ['cvl前端学习'],
        url: '/dicts/0_study_dayStudy.json',
        length: ${size},
        language: 'en',
        languageCategory: 'en',
      },
    /***** replace content end *****/
  `

  const updatedText = content.replace(regex, newObjectStr)

  await updateDictionaryContent(updatedText)

  console.log(`总共新增单词『${size}』个`)
}

task()
