import test from "node:test";
import assert from "node:assert/strict";
import { classifyInterval, validateClassification } from "../packages/classification/classifier.js";

const interval = { domain:"github.com", url:"https://github.com/openai", classification:null };
test("classification precedence favors page rule over domain and defaults", () => {
  const rules=[{id:"d",type:"domain",pattern:"github.com",category:"Work",productivityLevel:"productive",enabled:true},{id:"p",type:"page",pattern:interval.url,category:"Research",productivityLevel:"highly_productive",enabled:true}];
  assert.deepEqual(classifyInterval(interval,rules),{category:"Research",productivityLevel:"highly_productive",source:"user_rule"});
});
test("manual correction has highest precedence", () => {
  const manual={category:"Other",productivityLevel:"neutral",source:"manual_correction"};
  assert.equal(classifyInterval({...interval,classification:manual},[]),manual);
});
test("known and unknown domains receive deterministic defaults", () => {
  assert.deepEqual(classifyInterval(interval,[]),{category:"Development",productivityLevel:"productive",source:"default"});
  assert.deepEqual(classifyInterval({...interval,domain:"unknown.test"},[]),{category:"Other",productivityLevel:"neutral",source:"default"});
});
test("manual classification validation rejects invalid input", () => {
  assert.deepEqual(validateClassification({category:"Learning",productivityLevel:"productive"}),{category:"Learning",productivityLevel:"productive",source:"manual_correction"});
  assert.throws(()=>validateClassification({category:"",productivityLevel:"productive"}));
  assert.throws(()=>validateClassification({category:"Learning",productivityLevel:"super"}));
});
