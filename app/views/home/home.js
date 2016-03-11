"use strict";


angular.module("WeEats.controllers").controller("HomeCtrl",
	['$scope','FIREBASE_ROOT','$firebaseObject', 'AuthService', 'slackSvc', 
	'$routeParams', '$http', "SlackAuthService", "$firebaseArray", "$interval",
	function($scope, FIREBASE_ROOT, $firebaseObject, AuthService, 
		slackSvc, $routeParams, $http, SlackAuthService, $firebaseArray, $interval){

	var firebaseUsersRef = new Firebase(FIREBASE_ROOT);

	var promise;

	var authData = firebaseUsersRef.getAuth();
	var userRef= new Firebase(FIREBASE_ROOT+'/users/'+authData.uid);
	$scope.user = $firebaseObject(userRef); // make the user information available to the scope

	var allUsers = new Firebase(FIREBASE_ROOT+'/users/');
	var allUsersObj = $firebaseArray(allUsers);
	$scope.allUsers = allUsersObj;

	$scope.restaurantName, $scope.restaurantURL, $scope.menuURL, $scope.restaurantPhone = "";


	// TOOD make a firebase object of the restaurant reference in firebase
	$scope.restaurantData = {
		name: "",
		phone: "",
		restaurantURL:"",
		menuURL: "",
		orderTime:""
	}

	var restaurantRef = new Firebase(FIREBASE_ROOT + '/restaurant');
	$scope.restaurantObj = $firebaseObject(restaurantRef);
	if($scope.restaurantObj != 'undefined') {
		$scope.restaurantObj.$loaded(function(restaurantData) {
			$scope.restaurantData.timeToOrder = restaurantData.orderTime;
		});
	}


	var config = {
		client_id: '23324292563.23327735669',
		client_secret: 'f75c945c04460239fdbdc9b5be119a83',
		authParams : {
			client_id: '23324292563.23327735669',
			scope: 'incoming-webhook',
			redirect_uri: 'http://localhost:8000/app/#/home'
		}
	}
	$scope.order = "";

	$scope.logout = function() {
		AuthService.logout();
	}

	$scope.submitOrder = function() {
		//TODO 
		/* 
			gather date and time for key (this will be needed for record keeping)
			store data as value to key
		*/
	}

	function init() {
		SlackAuthService.access()
	}
	init();

	$scope.optOut = function () {
		// Todo get the reference of the current user and change opted out boolean
		userRef.update({"optedOut": true});
	}

	// for admin 


	//TODO: make reverse opt out functionality

	$scope.dateTimeNow = function() {
    $scope.orderTime = new Date();
  };
  $scope.dateTimeNow();
  
  $scope.toggleMinDate = function() {
    var minDate = new Date();
    // set to yesterday
    minDate.setDate(minDate.getDate() - 1);
    $scope.minDate = $scope.minDate ? null : minDate;
  };
   
  $scope.toggleMinDate();

  $scope.dateOptions = {
    showWeeks: false
  };
  
  // Disable weekend selection
  $scope.disabled = function(calendarDate, mode) {
    return mode === 'day' && ( calendarDate.getDay() === 0 || calendarDate.getDay() === 6 );
  };
  
  $scope.open = function($event,opened) {
    $event.preventDefault();
    $event.stopPropagation();
    $scope.dateOpened = true;
    console.log('opened');
  };
  
  $scope.dateOpened = false;
  $scope.hourStep = 1;
  $scope.format = "dd-MMM-yyyy";
  $scope.minuteStep = 15;

  $scope.timeOptions = {
    hourStep: [1, 2, 3],
    minuteStep: [1, 5, 10, 15, 25, 30]
  };

  $scope.showMeridian = true;
  $scope.timeToggleMode = function() {
    $scope.showMeridian = !$scope.showMeridian;
  };
  
  $scope.$watch("date", function(date) {
    // read date value
  }, true);
  
  $scope.resetHours = function() {
    $scope.date.setHours(1);
  };
	
	function remind() {
		// will check if user has not submitted order after the restaurant for the day has been submitted
		console.log("reminder");
		// if (!$scope.user.placedOrder || !$scope.user.optedOut) { // if that data exists, then cancel the $interval
		// 	$interval.cancel(promise);
		// };
		var currentTime = new Date().toTimeString();
		if (currentTime !== $scope.restaurantData.timeToOrder ) {
			allUsersObj.$loaded(function(data) {
				for (var i = 0; i < data.length; i++) {
					if(!data[i].placedOrder || !data[i].optedOut) {
						sendRecurringSlackMessage();
					} else {
						$interval.cancel(promise);
					}
				};
			});
		}
		
	}


	$scope.save = function() {

		promise = $interval(remind, 1800000); // send the reminder every thirty minutes
		var sanitizedDate = new Date($scope.orderTime);
		var timeForOrder = sanitizedDate.toTimeString();
		
		var restaurantData  = new Firebase(FIREBASE_ROOT+'/restaurant');
		restaurantData.update({"restaurantName":$scope.restaurantData.name, "menuURL":$scope.restaurantData.menuURL, "restaurantPhone":$scope.restaurantPhone,
		 "restaurantURL":$scope.restaurantData.restaurantURL, "orderTime":timeForOrder});

		allUsersObj.$loaded(function(data) {
			// make a new firebase reference for each user with $id and call .update{"optedOut": false, "placedOrder":false}
			var id = data[0].$id;
			var updateUserAfterOrderSave = new Firebase(FIREBASE_ROOT + '/users/'+id);
			updateUserAfterOrderSave.update({"optedOut": false, "placedOrder":false});
		});

		sendOneTimeSlackMessage($scope.restaurantData.name, timeForOrder);

	}

	function sendOneTimeSlackMessage(name, time) {
		/* Steps for sending slack notification of restaurant 
			1. Go through all users
			2. Check if they have a webhook attribute
			3. using $http, send a one time POST request that the restaurant has been set for the day.
		*/
		
		allUsersObj.$loaded(function(data) {
			for (var i = 0; i < data.length; i++) {
				var webhook = data[i].webhookURL;
				if(data[i].webhookURL) {
					$http({
						url: webhook,
						method:"POST",
						data: {
						    "attachments": [
						        {
						           
						            "fallback": "Order lunch now!",
						            "title": name,
						            "pretext": "Order lunch now!",
						            "text": "Order by: *" +time+"!*\n <http://localhost:8000/app/#/home|Click here> to order!",
						            "mrkdwn_in": [
						                "text",
						                "pretext"
						            ]
						        }
						    ]
						},
						headers: { "Content-Type":undefined }
					}).then(function success(response){
						console.log("success");
					}, function error(response){
						console.log("error ", response.status);
					})
				}
			};
		})

		}

		function sendRecurringSlackMessage() {
			allUsersObj.$loaded(function(data) {
				for (var i = 0; i < data.length; i++) {
					var webhook = data[i].webhookURL;
					if(data[i].webhookURL) {
						$http({
							url: webhook,
							method:"POST",
							data: {
							    "attachments": [
							        {
							           
							            "fallback": "Remember to order lunch!",
							            "title": "Remember to order lunch!",
							            "pretext": "Order lunch now!",
							            "text": "<http://localhost:8000/app/#/home|Click here> to order!",
							            "mrkdwn_in": [
							                "text",
							                "pretext"
							            ]
							        }
							    ]
							},
							headers: { "Content-Type":undefined }
						}).then(function success(response){
							console.log("success");
						}, function error(response){
							console.log("error ", response.status);
						})
					}
				};
			})
		}

		// end admin functions 

}]);