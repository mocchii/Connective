#include <iostream>
#include <stack>
#include <string>
#include <sstream>

using namespace std;

string parse(string str) {
  int len=str.size();
  double a, b;
  char c='\0';
  string buffer="";
  stack<double> ops;
  stack<double> store;
  for (int p=0; p<len; p++) {
    c=str[p];
	if (c>='a' && c<='j') {
	  ops.push((double)(c-'a'));
	}
	else if (c=='x') {
	  a=ops.top();
	  ops.pop();
	  b=ops.top();
	  ops.pop();
	  ops.push(a*b);
	}
	else if (c=='t') {
	  a=ops.top();
	  ops.pop();
	  b=ops.top();
	  ops.pop();
	  ops.push(a+b);
	}
	else if (c=='v') {
	  a=ops.top();
	  ops.pop();
	  b=ops.top();
	  ops.pop();
	  ops.push(a/b);
	}
	else if (c=='s') {
	  a=ops.top();
	  ops.pop();
	  b=ops.top();
	  ops.pop();
	  ops.push(b-a);
	}
	else if (c=='n') {
	  a=ops.top();
	  ops.pop();
	  if (a<=0.0) { ops.push(1.0); }
	  else { ops.push(0.0); }
	}
	else if (c=='l') {
	  a=ops.top();
	  ops.pop();
	  p=a-1;
	}
	else if (c=='q') {
	  a=ops.top();
	  ops.pop();
	  if (a<=0) {
	    int skipto=str.find_first_of('l', p+1);
		if (skipto<0) { p=str.size(); }
		else { p=skipto; }
	  }
	}
	else if (c=='o') {
	  ops.pop();
	}
	else if (c=='w') {
	  buffer+=(char)(int)ops.top();
	  ops.pop();
	}
	else if (c=='r') {
	  a=ops.top();
	  ops.pop();
	  ostringstream strdbl;
	  strdbl<<a;
	  buffer+=(string)strdbl.str();
	}
	else if (c=='p') {
	  cout<<endl<<"Enter a character: "<<flush;
	  char in;
	  cin>>in;
	  ops.push((double)(int)in);
	}
	else if (c=='z') {
	  cout<<endl<<"Enter a number: "<<flush;
	  double in;
	  cin>>in;
	  ops.push(in);
	}
	else if (c=='m') {
	  ops.push(ops.top());
	}
	else if (c=='k') {
	  store.push(ops.top());
	  ops.pop();
	}
	else if (c=='u') {
	  ops.push(store.top());
	  store.pop();
	}
  }
  return buffer;
}

int main() {
  string code;
  cout<<"Enter your Noygram: "<<flush;
  getline(cin, code);
  cout<<endl<<parse(code);
  int p;
  cin>>p;
  return 0;
}