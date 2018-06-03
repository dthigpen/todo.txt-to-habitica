var habId = "YOUR_API_ID";
var habToken = "YOUR_API_TOKEN";
var todoFolder = "todo-habitica";
var todoFileName = "todo.txt";
var doNotSyncTagName = "off";

/* Usage flow:
 * Use todo.txt to create todos. service adds uncompleted todos to Habitica if
 * (A) Name field of todo.txt todo does not match existing Habitica todos name field (in notes section).
 * (B) If name field does not exist, then long name is checked.
 * Service updates Habitica todos if
 * (A) Name field of todo.txt todo matches existing Habitica todos name field (or long name) and some content field is different
 * 
 */


function todoSync(){
  var habiticaTodos = fetchHabiticaTodos();
  var habiticaNames = habiticaTodos.map(function(a){return a.text;});
  
  var todoFile = DriveApp.getFoldersByName(todoFolder).next().getFilesByName(todoFileName).next().getAs("text/plain");
  var todoStrings = todoFile.getDataAsString().split("\n");
  for(var i = 0; i < todoStrings.length; i++){
    Logger.log(todoStrings[i]);
    var todoItem = parseTodoLine(todoStrings[i]);
    if(todoItem == undefined){
      continue;
    }
    //Only add the item to habitica if it does not contain +off and its text does not match one already on habitica and it is not completed
    if(todoItem.tags.indexOf(doNotSyncTagName) == -1 && !todoItem.completed && habiticaNames.indexOf(todoItem.text) == -1){
      addItemToHabitica(todoItem);
    }
    
  }
  parseTodoLine("x 2018-04-12 (B) 2018-04-05 Programming JS +homework +cs_class   diff:hard @school due:2018-04-12");
}
function checkHabiticaStatus(){
  var paramsTemplate = {
    "method" : "get",
    'contentType': 'application/json',
    "headers" : {
      "x-api-user" : habId, 
      "x-api-key" : habToken    
    }
  };
   var response = UrlFetchApp.fetch("https://habitica.com/api/v3/status", paramsTemplate);
  Logger.log(JSON.parse(response));  
  return response.status == "true";
}
function fetchHabiticaTags(){
  var paramsTemplate = {
    "method" : "GET",
    'contentType': 'application/json',
    "headers" : {
      "x-api-user" : habId, 
      "x-api-key" : habToken
    }
  };
  var response = UrlFetchApp.fetch("https://habitica.com/api/v3/tags", paramsTemplate);
  return JSON.parse(response).data;
}
function fetchHabiticaTodos(){
  var paramsTemplate = {
    "method" : "GET",
    'contentType': 'application/json',
    "headers" : {
      "x-api-user" : habId, 
      "x-api-key" : habToken
    }
  };
  var response = UrlFetchApp.fetch("https://habitica.com/api/v3/tasks/user?type=todos", paramsTemplate);
  var todoItems = JSON.parse(response).data;
  return todoItems; 
}
function parseFields(itemString){
  var fieldRE = new RegExp("(([a-zA-Z_]+):([a-zA-Z0-9_-]+))","g"); //Finds fields ex: due:2018-05-05 , diff:hard
  var fields = {};
  var fieldMatch = fieldRE.exec(itemString);
  var newStr = itemString;
    while(fieldMatch != undefined){
      fields[fieldMatch[2]] = fieldMatch[3];
      fieldMatch = fieldRE.exec(newStr);
      newStr = newStr.replace(fieldRE,'');
    }
  return fields;
}

function parseContexts(itemString){
  var contextRE = new RegExp("\\@([a-zA-Z0-9_\\-]+)","g"); //Finds contexts preceeded by @ sign. ex: Call client @Work , Fix door @home
  var contexts = []
  var contextMatch = contextRE.exec(itemString);
  var newStr = itemString;
    while(contextMatch != undefined){
      contexts.push(contextMatch[1]);
      contextMatch = contextRE.exec(newStr);
      newStr = newStr.replace(contextRE,'');
    }
  return contexts;
}

function parseTags(itemString){
  var tagRE = new RegExp("\\+([a-zA-Z0-9_\\-]+)","g"); //Finds tags preceeded by a + sign. ex: Sumbit +homework , Finish Report +project.
  var tags = []
  var tagMatch = tagRE.exec(itemString);
  var newStr = itemString;
    while(tagMatch != undefined){
      tags.push(tagMatch[1]);
      tagMatch = tagRE.exec(newStr);
      newStr = newStr.replace(tagRE,'');
    }
  return tags;
}
function parseTodoLine(itemString){
  if(itemString == undefined)
    itemString = "x 2018-04-24 (A) 2018-04-07 Networks EXAM 2 (Mon.) +networks @school +exam due:2018-04-23"
  var todoRE = new RegExp("(x(?: ))?([0-9]{4}-[0-9]{2}-[0-9]{2})? ?(\\([A-Z]\\))? ?([0-9]{4}-[0-9]{2}-[0-9]{2})? ?(.+)","g");
  var todoAttr = todoRE.exec(itemString);

  if(todoAttr == undefined || todoAttr == null){
    return undefined;
  }
  
  var todo = {};
  todo["completed"] = (todoAttr[1]!=undefined);
  todo["completedAt"] = (todoAttr[1]!=undefined && todoAttr[2]!=undefined) ? todoAttr[2]:null;
  todo["createdAt"] = (todoAttr[4]!=undefined) ? todoAttr[4] : null;
  todo["priority"] = (todoAttr[3]!=undefined) ? todoAttr[3] : null;
  todo["text"] = (todoAttr[5]!=undefined) ? todoAttr[5] : null;
  todo["tags"] = (todoAttr[5]!=undefined) ? parseTags(todoAttr[5]) : [];
  todo["contexts"] = (todoAttr[5]!=undefined) ? parseContexts(todoAttr[5]) : [];
  todo["fields"] = (todoAttr[5]!=undefined) ? parseFields(todoAttr[5]) : [];
  todo["due"] = (todo["fields"] != null && todo["fields"]["due"] != undefined) ? todo["fields"]["due"] : null;
  Logger.log(todoAttr[1]);
  Logger.log(todo.completed);
  return todo;      
}
function addItemToHabitica(todoItem){
  var paramsTemplate = {
    "method" : "post",
    "headers" : {
      "x-api-user" : habId, 
      "x-api-key" : habToken    
    },
    "payload" : {
      "type" : "todo",
      "text" : todoItem.text,
      "notes": "todo.txt"
    }
  };
  var response = UrlFetchApp.fetch("https://habitica.com/api/v3/tasks/user", paramsTemplate);
  Logger.log(JSON.parse(response));  
}



