import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ResearchEvaluationComponent } from './research-evaluation.component';

describe('ResearchEvaluationComponent', () => {
  let component: ResearchEvaluationComponent;
  let fixture: ComponentFixture<ResearchEvaluationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ResearchEvaluationComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ResearchEvaluationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
