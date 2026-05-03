<?php

class SettingsController extends AppController
{
    public function index()
    {
        $this->requireAuthentication();
        $title = '5 - Settings';

        return $this->render('settings', ['title' => $title]);
    }
}
