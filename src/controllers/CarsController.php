<?php

class CarsController extends AppController{

    public function index() {
        $this->requireAuthentication();
        $title = "2 - Cars";

        return $this->render("my_cars", ["title" => $title]);
    }

}
