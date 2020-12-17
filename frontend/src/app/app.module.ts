import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';

import { AppComponent } from './app.component';
import { MainComponent } from './components/main.component';
import { FormComponent } from './components/form.component';

const ROUTES: Routes = [
  { path: '', component: MainComponent },
  { path: 'form', component: FormComponent},
  { path: '**', redirectTo: '/', pathMatch: 'full' }
]

@NgModule({
  declarations: [
    AppComponent,
    MainComponent,
    FormComponent
  ],
  imports: [
    BrowserModule, FormsModule,
    ReactiveFormsModule, 
    HttpClientModule,
    RouterModule.forRoot(ROUTES)
  ],
  providers: [], //<--- insert service module
  bootstrap: [AppComponent]
})
export class AppModule { }
