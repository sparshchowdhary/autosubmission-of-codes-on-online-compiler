let fs=require('fs');
let path=require('path');
let cd=require('chromedriver');
let swd=require('selenium-webdriver');
let builder=new swd.Builder();
let driver=builder.forBrowser('chrome').build();
let cfile=process.argv[2];
let mfile=process.argv[3];
let cname=process.argv[4];
let globalQuestion,globalLectureElements,globalModuleElements,globalCode,globalCourseUrl,metadata,globalCourseIndex=0,globalCourse;
(async function(){
  try{
    await driver.manage().setTimeouts({
       implicit:10000,
       pageLoad:10000
    });
    let content=await fs.promises.readFile(cfile,'utf-8');
    let object=JSON.parse(content);
    let url=object.url;
    let username=object.username;
    let password=object.password;
    await driver.get(url);  //to open url
    let userElement=await driver.findElement(swd.By.css("input[type=email]"));
    await userElement.sendKeys(username);
    let passwordElement=await driver.findElement(swd.By.css("input[type=password]"));
    await passwordElement.sendKeys(password);
    let button=await driver.findElement(swd.By.css("button[type=submit]"));
    await button.click();
    let resourcePageLink= await driver.wait(swd.until.elementLocated(swd.By.css('div.resource a')));
    let resourcePageHref= await resourcePageLink.getAttribute('href');
    await driver.get(resourcePageHref);
    waitForOverlay();
    let courses=await driver.findElements(swd.By.css('h2.courseInput'));
    globalCourse=courses;
    let courseText=[];
    for(let i=0;i<globalCourse.length;i++){
        courseText.push(globalCourse[i].getText());
    }
    let coursePromiseCombined=await Promise.all(courseText)
    for(let i=0;i<coursePromiseCombined.length;i++){
        if(cname===coursePromiseCombined[i]){
            globalCourseIndex=i;
            break;
        }
    }
    await globalCourse[globalCourseIndex].click();
    let urlPromise=await driver.getCurrentUrl();
    globalCourseUrl=urlPromise;
    let metadataPromise=await fs.promises.readFile(mfile,'utf-8');
    metadata=await JSON.parse(metadataPromise);
    let previousQuestionPromise=await solveQuestion(metadata.questions[0]);
    for(let i=1;i<metadata.questions.length;i++){
        previousQuestionPromise=await solveQuestion(metadata.questions[i]);
    }
   }catch(err){
     console.log(err);
  }
})();

async function solveQuestion(question){
    await openQuestion(question);
    let editorPromise=await driver.findElement(swd.By.css('.editorTab'));
    await editorPromise.click();
    let editorBox=await driver.findElement(swd.By.css('textarea.ace_text-input'));
    await editorBox.sendKeys(swd.Key.chord(swd.Key.CONTROL,'a'));
    await editorBox.sendKeys(swd.Key.DELETE);
    let codeFileRead=await fs.promises.readFile(path.join(question.path,"main.java"),'utf-8');
    globalCode=codeFileRead;
    let customInputBox=await driver.findElement(swd.By.css('#customInput'));
    await customInputBox.sendKeys(globalCode);
    await customInputBox.sendKeys(swd.Key.chord(swd.Key.CONTROL,'a'));
    await customInputBox.sendKeys(swd.Key.chord(swd.Key.CONTROL,'x'));
    await customInputBox.sendKeys(swd.Key.chord(swd.Key.CONTROL,'v'));
    let submitClick=await driver.findElement(swd.By.css('#submitCode'));
    await submitClick.click();
    let siteOverlay=waitForOverlay();
    await siteOverlay;
    let testCaseList=await driver.findElement(swd.By.css('#testCases'));
    let testCaseHiddenElementArr=[];
    for(let i=0;i<testCaseList.length;i++){
        let testCaseHiddenElementPromise=await testCaseList[i].findElement(swd.By.css("input[type=hidden]"));
        testCaseHiddenElementArr.push(testCaseHiddenElementPromise);
    }
    let testCaseHiddenElement=await Promise.all(testCaseHiddenElementArr);
    let testCaseReadPromiseArr=[];
    for(let i=0;i<testCaseHiddenElement.length;i++){
        let testCaseInputPromise=await testCaseHiddenElement[i][0].getAttribute('value');
        let testCaseExpectedOutputPromise=await testCaseHiddenElement[i][0].getAttribute('value');
        let testCaseActualOutputPromise=await testCaseHiddenElement[i][0].getAttribute('value');
        let combinedTestCasePromise=await Promise.all([testCaseInputPromise,testCaseExpectedOutputPromise,testCaseActualOutputPromise]);
        testCaseReadPromiseArr.push(combinedTestCasePromise);
    }
    let allTestCases=await Promise.all(testCaseHiddenElementArr);
    let testCaseObject=allTestCases.map(function(allTestCases){
        return{
            input:allTestCases[0],
            expectedOutput:allTestCases[1],
            actualOutput:allTestCases[2]
        }
    })
    let testCaseWriteFile=await fs.promises.writeFile(path.join(question.path,"tc.json"), JSON.stringify(testCaseObject));
    return testCaseWriteFile;
}

async function openQuestion(question){
    await driver.get(globalCourseUrl);
    waitForOverlay();
    let moduleElements = await driver.findElements(swd.By.css('ul.tabs div.hoverable'))
    globalModuleElements = moduleElements
    let moduleTextPromiseArr = []
    for (let i = 0; i < moduleElements.length; i++) {
        let moduleTextPromise = await globalModuleElements[i].getText();
        moduleTextPromiseArr.push(moduleTextPromise)
    }
    let moduleTexts = await Promise.all(moduleTextPromiseArr)
    let moduleClickPromise; 
    for (let i = 0; i < moduleTexts.length; i++) {
        if (question.module === moduleTexts[i].trim()) {
            moduleClickPromise = await globalModuleElements[i].click(); 
            break;
        }
    }
    await moduleClickPromise 
    let lectureElements = await driver.findElements(swd.By.css('ul.collection li.collection-item p.title'))
    globalLectureElements = lectureElements
    let lectureTextPromiseArr = []
    for (let i = 0; i < globalLectureElements.length; i++) {
        let lectureTextPromise = await globalLectureElements[i].getText();
        lectureTextPromiseArr.push(lectureTextPromise);
    }
    let lectureTexts = await Promise.all(lectureTextPromiseArr)
    let lectureClickPromise;
    for (let i = 0; i < lectureTexts.length; i++) {
        if (question.lecture === lectureTexts[i].trim()) {
            lectureClickPromise = await globalLectureElements[i].click();
            break;
        }
    }
    await lectureClickPromise;
    let questionElements = await driver.findElements(swd.By.css('ul.collection li.collection-item p'))
    globalQuestion = questionElements
    let questionTextPromiseArr = [];
    for (let i = 0; i < globalQuestion.length; i++) {
        let questionReadPromise = await globalQuestion[i].getText();
        questionTextPromiseArr.push(questionReadPromise)
    }
    let questionTexts = await Promise.all(questionTextPromiseArr)
    let questionClickPromise;
    for (let i = 0; i < questionTexts.length; i++) {
        if (questionTexts[i].trim().includes(question.title) === true){
            questionClickPromise =  await globalQuestion[i].click();
            break;
        }
    } 
   if(questionClickPromise){
     return questionClickPromise;  
   }else{
       return undefined
   }
}  

async function waitForOverlay(){
    let overlay=await driver.findElement(swd.By.css('div#siteOverlay'));
    await driver.wait(swd.until.elementIsNotVisible(overlay));
}
   
    
